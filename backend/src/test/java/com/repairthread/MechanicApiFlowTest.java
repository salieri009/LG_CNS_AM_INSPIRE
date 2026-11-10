package com.repairthread;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** 정비사 화면 데모 루프: 차량 → 고장코드 → 후보 → 3D 작업 → 고전압 확인 → 결과 기록 → 관측 비율 갱신 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MechanicApiFlowTest {
    static final String M3_VIN = "5YJ3E1EA0JF000000";
    static final String MX_VIN = "7SAXCBE50NF000000";

    @Autowired MockMvc mvc;

    ResultActions post(String url, String body, String user) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(url).header("X-User-Id", user)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    ResultActions put(String url, String body, String user) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(url).header("X-User-Id", user)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    String body(ResultActions r) throws Exception { return r.andReturn().getResponse().getContentAsString(); }

    String newJob(String vehicleId, String code, String user) throws Exception {
        return JsonPath.read(body(post("/api/v1/repair-jobs", "{\"vehicleId\":\"" + vehicleId + "\",\"dtcCode\":\"" + code + "\"}", user)
                .andExpect(status().isCreated())), "$.jobId");
    }

    @Test
    void lookupVehicleByVin() throws Exception {
        post("/api/v1/vehicle-lookups", "{\"vin\":\" 5yj3e1ea0jf000000 \"}", "tech-kim").andExpect(status().isOk())
                .andExpect(jsonPath("$.vehicleId").value("veh-m3-001")).andExpect(jsonPath("$.model").value("Tesla Model 3"));
        post("/api/v1/vehicle-lookups", "{\"vin\":\"5YJ3E1EA0JF999999\"}", "tech-kim").andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value(containsString("미등록 차량")));
        post("/api/v1/vehicle-lookups", "{\"vin\":\"SHORT\"}", "tech-kim").andExpect(status().isBadRequest());
    }

    @Test
    void screenHelpers() throws Exception {
        mvc.perform(get("/api/v1/vehicles")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].vin").value(M3_VIN));
        mvc.perform(get("/api/v1/me")).andExpect(jsonPath("$.name").value("김 주임"));
        mvc.perform(get("/api/v1/vehicles/veh-m3-001/dtc-codes")).andExpect(jsonPath("$[*].code", hasItems("B1A24", "P0A3F", "B0F71")))
                .andExpect(jsonPath("$[*].vehicle", everyItem(is("Tesla Model 3"))));
        mvc.perform(get("/api/v1/repair-jobs").header("X-User-Id", "tech-kim")).andExpect(jsonPath("$[*].code", hasItems("P0A3F", "B1A24")))
                .andExpect(jsonPath("$[*].vin", hasItem(M3_VIN)));
    }

    @Test
    void resumeSeededLiveJob() throws Exception {
        // 시드의 진행 중 작업(P0A3F, 3단계까지 끝냄)을 다시 열면 같은 task와 고전압 확인 기록이 돌아온다
        mvc.perform(get("/api/v1/repair-jobs/job-seed-h1").header("X-User-Id", "tech-kim")).andExpect(status().isOk())
                .andExpect(jsonPath("$.dtcCode").value("P0A3F")).andExpect(jsonPath("$.candidates[0].partId").value("part-rdu-resolver"));
        mvc.perform(get("/api/v1/repair-jobs/job-seed-h1").header("X-User-Id", "tech-other")).andExpect(status().isForbidden());
        post("/api/v1/repair-jobs/job-seed-h1/tasks", "{\"partId\":\"part-rdu-resolver\"}", "tech-kim")
                .andExpect(jsonPath("$.taskId").value("task-seed-h1")).andExpect(jsonPath("$.ackedStepIds", hasSize(1)));
    }

    @Test
    void candidatesFollowOfficialOrderWithObservedRatio() throws Exception {
        String r = body(post("/api/v1/repair-jobs", "{\"vehicleId\":\"veh-m3-001\",\"dtcCode\":\"b1a24\"}", "tech-flow-a")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.dtcCode").value("B1A24"))
                .andExpect(jsonPath("$.candidates[*].officialOrder", contains(1, 2, 3, 4)))
                .andExpect(jsonPath("$.candidates[0].partId").value("part-latch-rl"))
                .andExpect(jsonPath("$.candidates[0].procedure.steps").value(7))
                .andExpect(jsonPath("$.candidates[0].otherVehicles[0].vehicle").value("Model X"))
                .andExpect(jsonPath("$.candidates[1].procedureId").value("")));
        int n = JsonPath.read(r, "$.candidates[0].observedRaw.n");
        int count = JsonPath.read(r, "$.candidates[0].observedRaw.count");
        String jobId = JsonPath.read(r, "$.jobId");

        String task = body(post("/api/v1/repair-jobs/" + jobId + "/tasks", "{\"partId\":\"part-latch-rl\"}", "tech-flow-a")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.steps", hasSize(7))).andExpect(jsonPath("$.partSet").value("door-rl"))
                .andExpect(jsonPath("$.model.assetUrl").value("/models/tesla-model3.glb")));
        String taskId = JsonPath.read(task, "$.taskId");

        String completion = "{\"actualCausePartId\":\"part-latch-rl\",\"actualMinutes\":55,\"stuckStepId\":\"latch-s3\",\"moduleReplaced\":false,"
                + "\"memo\":\"글라스 클램프 볼트는 새것으로\",\"memoPublic\":true,"
                + "\"stepLogs\":[{\"stepId\":\"latch-s1\",\"startedAt\":1762736400000,\"endedAt\":1762736880000,\"blocked\":false},"
                + "{\"stepId\":\"latch-s3\",\"startedAt\":1762736880000,\"endedAt\":1762737600000,\"blocked\":true,\"reason\":\"클램프 볼트 고착\"}]}";
        put("/api/v1/repair-jobs/" + jobId + "/completion", completion, "tech-flow-a").andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicated").value(false)).andExpect(jsonPath("$.tipEntryId").exists());
        // 같은 요청 재전송은 한 건으로 처리
        put("/api/v1/repair-jobs/" + jobId + "/completion", completion, "tech-flow-a").andExpect(jsonPath("$.duplicated").value(true));

        // 다음 정비사가 보는 관측 비율: n과 분자가 1씩 늘고, 공개 동의한 메모가 3단계 팁으로 보인다
        post("/api/v1/repair-jobs", "{\"vehicleId\":\"veh-m3-001\",\"dtcCode\":\"B1A24\"}", "tech-flow-b")
                .andExpect(jsonPath("$.candidates[0].observed.n").value(n + 1))
                .andExpect(jsonPath("$.candidates[0].observed.count").value(count + 1))
                .andExpect(jsonPath("$.candidates[1].observedRaw.n").value(n + 1));
        mvc.perform(get("/api/v1/procedure-steps/latch-s3/knowledge").header("X-User-Id", "tech-flow-b"))
                .andExpect(jsonPath("$[*].body", hasItem("글라스 클램프 볼트는 새것으로")));
        mvc.perform(get("/api/v1/repair-jobs").header("X-User-Id", "tech-flow-a"))
                .andExpect(jsonPath("$[0].status").value("done")).andExpect(jsonPath("$[0].taskId").value(taskId));
    }

    @Test
    void unknownCauseIsLeftOutOfDenominator() throws Exception {
        String job = newJob("veh-m3-001", "B0F71", "tech-flow-c");
        String before = body(post("/api/v1/repair-jobs", "{\"vehicleId\":\"veh-m3-001\",\"dtcCode\":\"B0F71\"}", "tech-flow-c"));
        int n = JsonPath.read(before, "$.candidates[0].observedRaw.n");
        put("/api/v1/repair-jobs/" + job + "/completion", "{\"actualCausePartId\":null,\"actualMinutes\":20,\"memo\":\"\",\"memoPublic\":true}", "tech-flow-c")
                .andExpect(jsonPath("$.duplicated").value(false)).andExpect(jsonPath("$.tipEntryId").doesNotExist());
        post("/api/v1/repair-jobs", "{\"vehicleId\":\"veh-m3-001\",\"dtcCode\":\"B0F71\"}", "tech-flow-c")
                .andExpect(jsonPath("$.candidates[0].observedRaw.n").value(n));
    }

    @Test
    void highVoltageStepsNeedServerAck() throws Exception {
        String job = newJob("veh-m3-001", "P0A3F", "tech-hv");
        String task = body(post("/api/v1/repair-jobs/" + job + "/tasks", "{\"partId\":\"part-rdu-resolver\"}", "tech-hv"));
        String taskId = JsonPath.read(task, "$.taskId");
        String hvStep = JsonPath.<java.util.List<String>>read(task, "$.steps[?(@.requiresHvAck == true)].stepId").getFirst();
        String plainStep = JsonPath.<java.util.List<String>>read(task, "$.steps[?(@.requiresHvAck == false)].stepId").getFirst();

        String done = "{\"actualCausePartId\":\"part-rdu-resolver\",\"actualMinutes\":100}";
        put("/api/v1/repair-jobs/" + job + "/completion", done, "tech-hv").andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(containsString("고전압 확인")));
        put("/api/v1/tasks/" + taskId + "/steps/" + plainStep + "/ack", "", "tech-hv").andExpect(status().isBadRequest());
        put("/api/v1/tasks/" + taskId + "/steps/" + hvStep + "/ack", "", "tech-other").andExpect(status().isForbidden());
        String first = JsonPath.read(body(put("/api/v1/tasks/" + taskId + "/steps/" + hvStep + "/ack", "", "tech-hv").andExpect(status().isOk())), "$.ackedAt");
        String again = JsonPath.read(body(put("/api/v1/tasks/" + taskId + "/steps/" + hvStep + "/ack", "", "tech-hv")), "$.ackedAt");
        org.assertj.core.api.Assertions.assertThat(again).isEqualTo(first);

        // 같은 부품으로 다시 열면 같은 task와 확인 기록이 돌아온다 (작업 재개)
        post("/api/v1/repair-jobs/" + job + "/tasks", "{\"partId\":\"part-rdu-resolver\"}", "tech-hv")
                .andExpect(jsonPath("$.taskId").value(taskId)).andExpect(jsonPath("$.ackedStepIds", hasItem(hvStep)));
        put("/api/v1/repair-jobs/" + job + "/completion", done, "tech-hv").andExpect(status().isOk());
    }

    @Test
    void rejectsInvalidRequests() throws Exception {
        post("/api/v1/repair-jobs", "{\"vehicleId\":\"veh-m3-001\",\"dtcCode\":\"P9999\"}", "tech-x").andExpect(status().isNotFound());
        post("/api/v1/repair-jobs", "{\"vehicleId\":\"veh-m3-001\",\"dtcCode\":\"hello\"}", "tech-x").andExpect(status().isBadRequest());
        // 같은 고장코드라도 차종마다 절차가 다르다 (Model X B1A24 → 팰컨 윙 10단계)
        String mx = newJob("veh-mx-001", "B1A24", "tech-x");
        post("/api/v1/repair-jobs/" + mx + "/tasks", "{\"partId\":\"part-latch-rl\"}", "tech-x").andExpect(status().isBadRequest());
        String job = newJob("veh-m3-001", "B1A24", "tech-x");
        post("/api/v1/repair-jobs/" + job + "/tasks", "{\"partId\":\"part-switch-rl\"}", "tech-x").andExpect(status().isNotFound());
        put("/api/v1/repair-jobs/" + job + "/completion", "{\"actualCausePartId\":\"part-12v\",\"actualMinutes\":10}", "tech-x").andExpect(status().isBadRequest());
        put("/api/v1/repair-jobs/" + job + "/completion", "{\"actualCausePartId\":\"part-latch-rl\",\"actualMinutes\":0}", "tech-x").andExpect(status().isBadRequest());
        put("/api/v1/repair-jobs/" + job + "/completion", "{\"actualCausePartId\":\"part-latch-rl\",\"actualMinutes\":30,\"stuckStepId\":\"lv-s1\"}", "tech-x").andExpect(status().isBadRequest());
    }

    @Test
    void privateTipsAreVisibleOnlyToAuthor() throws Exception {
        post("/api/v1/procedure-steps/latch-s2/knowledge", "{\"body\":\"나만 보는 메모\",\"isPublic\":false}", "tech-tip").andExpect(status().isCreated())
                .andExpect(jsonPath("$.visibility").value("PRIVATE"));
        mvc.perform(get("/api/v1/procedure-steps/latch-s2/knowledge").header("X-User-Id", "tech-tip")).andExpect(jsonPath("$[*].body", hasItem("나만 보는 메모")));
        mvc.perform(get("/api/v1/procedure-steps/latch-s2/knowledge").header("X-User-Id", "tech-other")).andExpect(jsonPath("$[*].body", not(hasItem("나만 보는 메모"))));
        post("/api/v1/procedure-steps/latch-s2/knowledge", "{\"body\":\"  \",\"isPublic\":true}", "tech-tip").andExpect(status().isBadRequest());
        post("/api/v1/procedure-steps/nope/knowledge", "{\"body\":\"x\",\"isPublic\":true}", "tech-tip").andExpect(status().isNotFound());
    }

    @Test
    void cancelRemovesJobFromTodayAndStats() throws Exception {
        String job = newJob("veh-m3-001", "B1A24", "tech-cancel");
        post("/api/v1/repair-jobs/" + job + "/tasks", "{\"partId\":\"part-latch-rl\"}", "tech-cancel").andExpect(status().isCreated());
        mvc.perform(get("/api/v1/repair-jobs").header("X-User-Id", "tech-cancel")).andExpect(jsonPath("$[*].jobId", hasItem(job)));

        put("/api/v1/repair-jobs/" + job + "/cancellation", "", "tech-other").andExpect(status().isForbidden());
        String first = JsonPath.read(body(put("/api/v1/repair-jobs/" + job + "/cancellation", "", "tech-cancel")
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"))), "$.cancelledAt");
        // 다시 보내도 같은 결과
        put("/api/v1/repair-jobs/" + job + "/cancellation", "", "tech-cancel").andExpect(jsonPath("$.cancelledAt").value(first));
        mvc.perform(get("/api/v1/repair-jobs").header("X-User-Id", "tech-cancel")).andExpect(jsonPath("$[*].jobId", not(hasItem(job))));

        // 취소한 작업에는 더 진행하거나 결과를 남길 수 없다 (통계에 들어가지 않음)
        post("/api/v1/repair-jobs/" + job + "/tasks", "{\"partId\":\"part-latch-rl\"}", "tech-cancel").andExpect(status().isConflict());
        put("/api/v1/repair-jobs/" + job + "/completion", "{\"actualCausePartId\":\"part-latch-rl\",\"actualMinutes\":30}", "tech-cancel")
                .andExpect(status().isConflict());

        // 완료한 작업은 취소할 수 없다
        String done = newJob("veh-m3-001", "B1A24", "tech-cancel");
        put("/api/v1/repair-jobs/" + done + "/completion", "{\"actualCausePartId\":null,\"actualMinutes\":5}", "tech-cancel").andExpect(status().isOk());
        put("/api/v1/repair-jobs/" + done + "/cancellation", "", "tech-cancel").andExpect(status().isConflict());
        put("/api/v1/repair-jobs/nope/cancellation", "", "tech-cancel").andExpect(status().isNotFound());
    }

    @Test
    void pauseSavesProgressAndResumesAtThatStep() throws Exception {
        String job = newJob("veh-m3-001", "B1A24", "tech-pause");
        String taskId = JsonPath.read(body(post("/api/v1/repair-jobs/" + job + "/tasks", "{\"partId\":\"part-latch-rl\"}", "tech-pause")), "$.taskId");
        String progress = "{\"currentStepId\":\"latch-s3\",\"stepLogs\":["
                + "{\"stepId\":\"latch-s1\",\"startedAt\":1762736400000,\"endedAt\":1762736700000,\"blocked\":false},"
                + "{\"stepId\":\"latch-s2\",\"startedAt\":1762736700000,\"endedAt\":1762736900000,\"blocked\":false},"
                + "{\"stepId\":\"latch-s3\",\"startedAt\":1762736900000,\"blocked\":true,\"reason\":\"클램프 고착\"}]}";
        put("/api/v1/tasks/" + taskId + "/progress", progress, "tech-pause").andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStep").value(2)).andExpect(jsonPath("$.savedSteps").value(3));
        // 오늘 작업 목록: 진행 중, 3단계(0부터 2)에서 이어하기
        mvc.perform(get("/api/v1/repair-jobs").header("X-User-Id", "tech-pause"))
                .andExpect(jsonPath("$[0].jobId").value(job)).andExpect(jsonPath("$[0].status").value("live")).andExpect(jsonPath("$[0].step").value(2));
        // 같은 진행을 다시 보내도 단계 기록은 한 줄씩 (덮어씀)
        put("/api/v1/tasks/" + taskId + "/progress", progress, "tech-pause").andExpect(status().isOk());
        mvc.perform(get("/api/v1/repair-jobs").header("X-User-Id", "tech-pause")).andExpect(jsonPath("$[0].step").value(2));

        put("/api/v1/tasks/" + taskId + "/progress", "{\"currentStepId\":\"lv-s1\"}", "tech-pause").andExpect(status().isBadRequest());
        put("/api/v1/tasks/" + taskId + "/progress", "{\"currentStepId\":\"latch-s2\"}", "tech-other").andExpect(status().isForbidden());
        put("/api/v1/tasks/" + taskId + "/progress", "{}", "tech-pause").andExpect(status().isBadRequest());
    }

    @Test
    void progressCannotSkipUnackedHighVoltageStep() throws Exception {
        String job = newJob("veh-m3-001", "P0A3F", "tech-hv2");
        String task = body(post("/api/v1/repair-jobs/" + job + "/tasks", "{\"partId\":\"part-rdu-resolver\"}", "tech-hv2"));
        String taskId = JsonPath.read(task, "$.taskId");
        String s2 = JsonPath.read(task, "$.steps[1].stepId");
        put("/api/v1/tasks/" + taskId + "/progress", "{\"currentStepId\":\"" + s2 + "\"}", "tech-hv2").andExpect(status().isConflict());
        String hv = JsonPath.read(task, "$.steps[0].stepId");
        put("/api/v1/tasks/" + taskId + "/steps/" + hv + "/ack", "", "tech-hv2").andExpect(status().isOk());
        put("/api/v1/tasks/" + taskId + "/progress", "{\"currentStepId\":\"" + s2 + "\"}", "tech-hv2").andExpect(status().isOk());
        // 취소 뒤에는 진행을 저장할 수 없다
        put("/api/v1/repair-jobs/" + job + "/cancellation", "", "tech-hv2").andExpect(status().isOk());
        put("/api/v1/tasks/" + taskId + "/progress", "{\"currentStepId\":\"" + s2 + "\"}", "tech-hv2").andExpect(status().isConflict());
    }
}
