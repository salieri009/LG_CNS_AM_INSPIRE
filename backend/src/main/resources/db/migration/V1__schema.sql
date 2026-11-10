-- Repair Thread 스키마 (docs/data-dictionary.md 기준, 모듈별 스키마)
-- 3D 표시용 구조(상자 좌표, 카메라, 강조 부품 목록 등)는 조회만 하므로 JSON 문자열(TEXT)로 둔다.
-- 고장코드는 작업 한 건에 하나만 받으므로 JOB_DTC_RESULT는 REPAIR_JOB 컬럼으로 합쳤다.

-- auth ---------------------------------------------------------------
CREATE TABLE auth.app_user (
    id              VARCHAR(64)  PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    organization    VARCHAR(200) NOT NULL,
    role            VARCHAR(30)  NOT NULL,
    clearance_level VARCHAR(10)  NOT NULL,
    career          VARCHAR(50),
    badges_json     TEXT
);

-- production ---------------------------------------------------------
CREATE TABLE production.vehicle_profile (
    id           VARCHAR(64)  PRIMARY KEY,
    manufacturer VARCHAR(100) NOT NULL,
    model        VARCHAR(100) NOT NULL,
    spec         VARCHAR(100) NOT NULL,
    model_years  VARCHAR(100),
    body_summary VARCHAR(200)
);

CREATE TABLE production.vehicle (
    id               VARCHAR(64) PRIMARY KEY,
    profile_id       VARCHAR(64) NOT NULL,
    vin_lookup_hmac  CHAR(64)    NOT NULL,
    production_date  VARCHAR(7)  NOT NULL,
    plant_line       VARCHAR(100),
    -- 시연 차량 목록에서 고를 수 있게 시연 데이터에만 VIN을 둔다. 실제 차량은 NULL (HMAC으로만 조회)
    demo_vin         VARCHAR(17),
    data_origin      VARCHAR(10) NOT NULL,
    CONSTRAINT uk_vehicle_vin_hmac UNIQUE (vin_lookup_hmac)
);

CREATE TABLE production.part (
    id           VARCHAR(64)  PRIMARY KEY,
    display_name VARCHAR(200) NOT NULL
);

-- diagnosis ----------------------------------------------------------
CREATE TABLE diagnosis.dtc_code (
    profile_id  VARCHAR(64)  NOT NULL,
    code        VARCHAR(10)  NOT NULL,
    description VARCHAR(200) NOT NULL,
    symptom     VARCHAR(300) NOT NULL,
    searches    INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (profile_id, code)
);

CREATE TABLE diagnosis.diagnostic_rule (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    profile_id        VARCHAR(64)  NOT NULL,
    dtc_code          VARCHAR(10)  NOT NULL,
    candidate_part_id VARCHAR(64)  NOT NULL,
    candidate_name    VARCHAR(200) NOT NULL,
    official_order    INT          NOT NULL,
    check_method      VARCHAR(300) NOT NULL,
    procedure_id      VARCHAR(64),
    chronic           BOOLEAN      NOT NULL DEFAULT FALSE,
    highlight_node    VARCHAR(64),
    box_json          TEXT,
    CONSTRAINT uk_rule UNIQUE (profile_id, dtc_code, candidate_part_id)
);

-- guide --------------------------------------------------------------
CREATE TABLE guide.model_asset (
    id                 VARCHAR(64)  PRIMARY KEY,
    asset_url          VARCHAR(300) NOT NULL,
    mesh_manifest_json TEXT         NOT NULL
);

CREATE TABLE guide.procedure_def (
    id                VARCHAR(64)  PRIMARY KEY,
    profile_id        VARCHAR(64)  NOT NULL,
    target_part_id    VARCHAR(64)  NOT NULL,
    target_part_name  VARCHAR(200) NOT NULL,
    asset_id          VARCHAR(64)  NOT NULL,
    version           VARCHAR(100) NOT NULL,
    source_ref        VARCHAR(500) NOT NULL,
    access_level      VARCHAR(10)  NOT NULL DEFAULT 'L1',
    standard_minutes  INT          NOT NULL,
    hero_image        VARCHAR(300),
    part_set          VARCHAR(20)  NOT NULL,
    parts_json        TEXT,
    after_steps_json  TEXT
);

CREATE TABLE guide.procedure_step (
    id                   VARCHAR(64)  PRIMARY KEY,
    procedure_id         VARCHAR(64)  NOT NULL,
    step_order           INT          NOT NULL,
    title                VARCHAR(200) NOT NULL,
    description          TEXT         NOT NULL,
    fastener_type        VARCHAR(20)  NOT NULL,
    torque               VARCHAR(200),
    minutes              INT          NOT NULL,
    requires_hv_ack      BOOLEAN      NOT NULL DEFAULT FALSE,
    highlight_nodes_json TEXT         NOT NULL,
    fallback_image       VARCHAR(300),
    camera_json          TEXT,
    CONSTRAINT uk_step_order UNIQUE (procedure_id, step_order)
);

-- knowledge ----------------------------------------------------------
CREATE TABLE knowledge.knowledge_entry (
    id          VARCHAR(64)  PRIMARY KEY,
    step_id     VARCHAR(64)  NOT NULL,
    author_id   VARCHAR(64)  NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    parent_id   VARCHAR(64),
    entry_type  VARCHAR(20)  NOT NULL,
    body        TEXT         NOT NULL,
    visibility  VARCHAR(10)  NOT NULL,
    helpful     INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMP(3) NOT NULL
);
CREATE INDEX ix_knowledge_step ON knowledge.knowledge_entry (step_id);

-- record -------------------------------------------------------------
CREATE TABLE record.repair_job (
    id                    VARCHAR(64)  PRIMARY KEY,
    vehicle_id            VARCHAR(64)  NOT NULL,
    profile_id            VARCHAR(64)  NOT NULL,
    dtc_code              VARCHAR(10)  NOT NULL,
    technician_id         VARCHAR(64)  NOT NULL,
    status                VARCHAR(20)  NOT NULL,
    symptoms              VARCHAR(500),
    data_origin           VARCHAR(10)  NOT NULL,
    -- 작업을 만들 때 진단 모듈이 준 원인 후보. 완료 기록의 원인 부품을 이 안에서만 받는다 (모듈 간 역참조 없이 검증)
    candidate_part_ids    VARCHAR(1000),
    actual_cause_part_id  VARCHAR(64),
    actual_minutes        INT,
    stuck_step_id         VARCHAR(64),
    module_replaced       BOOLEAN,
    memo                  TEXT,
    memo_public           BOOLEAN,
    created_at            TIMESTAMP(3) NOT NULL,
    completed_at          TIMESTAMP(3)
);
CREATE INDEX ix_job_stats ON record.repair_job (profile_id, dtc_code, status);
CREATE INDEX ix_job_technician ON record.repair_job (technician_id, created_at);

CREATE TABLE record.job_task (
    id                        VARCHAR(64) PRIMARY KEY,
    job_id                    VARCHAR(64) NOT NULL,
    procedure_id              VARCHAR(64) NOT NULL,
    procedure_version         VARCHAR(100) NOT NULL,
    target_part_id            VARCHAR(64) NOT NULL,
    standard_minutes_snapshot INT         NOT NULL,
    step_count                INT         NOT NULL,
    created_at                TIMESTAMP(3) NOT NULL
);
CREATE INDEX ix_task_job ON record.job_task (job_id);

CREATE TABLE record.step_record (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_id            VARCHAR(64)  NOT NULL,
    step_id            VARCHAR(64)  NOT NULL,
    started_at         TIMESTAMP(3),
    ended_at           TIMESTAMP(3),
    blocked            BOOLEAN      NOT NULL DEFAULT FALSE,
    difficulty_note    VARCHAR(500),
    safety_ack_user_id VARCHAR(64),
    safety_ack_at      TIMESTAMP(3),
    CONSTRAINT uk_step_record UNIQUE (task_id, step_id)
);

-- 시연 시작 시점의 관측 원인 집계(예시 데이터). 실제 완료 기록은 조회할 때 여기에 더한다.
-- 데이터 사전의 CAUSE_STAT 결정: 시드 기준선만 테이블로 두고 나머지는 조회 때 계산.
CREATE TABLE record.cause_stat_baseline (
    profile_id VARCHAR(64) NOT NULL,
    dtc_code   VARCHAR(10) NOT NULL,
    part_id    VARCHAR(64) NOT NULL,
    cause_count INT        NOT NULL,
    PRIMARY KEY (profile_id, dtc_code, part_id)
);
CREATE TABLE record.cause_stat_baseline_total (
    profile_id VARCHAR(64) NOT NULL,
    dtc_code   VARCHAR(10) NOT NULL,
    n          INT         NOT NULL,
    PRIMARY KEY (profile_id, dtc_code)
);
