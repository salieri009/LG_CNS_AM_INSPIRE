package com.repairthread.production;

import com.repairthread.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/** 생산 연동 모듈. 지금은 제조사 시스템 대신 자체 생산 DB(시드)를 본다 */
@Service
public class VehicleCatalog {
    private static final Pattern VIN = Pattern.compile("[A-HJ-NPR-Z0-9]{17}");
    private static final String SELECT = """
            SELECT v.id, v.profile_id, p.model, p.spec, v.production_date, v.plant_line
            FROM production.vehicle v JOIN production.vehicle_profile p ON p.id = v.profile_id
            """;
    private static final RowMapper<VehicleInfo> ROW = (rs, i) -> new VehicleInfo(rs.getString("id"), rs.getString("profile_id"),
            rs.getString("model"), rs.getString("spec"), rs.getString("production_date"), rs.getString("plant_line"));

    private final JdbcClient jdbc;
    private final SecretKeySpec key;

    VehicleCatalog(JdbcClient jdbc, @Value("${repair-thread.vin-hmac-key}") String hmacKey) {
        this.jdbc = jdbc;
        this.key = new SecretKeySpec(hmacKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    public VehicleInfo lookupByVin(String rawVin) {
        String vin = rawVin == null ? "" : rawVin.trim().toUpperCase(Locale.ROOT);
        if (!VIN.matcher(vin).matches()) throw ApiException.badRequest("VIN 형식이 아닙니다. 17자리(I·O·Q 제외)를 확인해 주세요.");
        return jdbc.sql(SELECT + " WHERE v.vin_lookup_hmac = ?").param(hmac(vin)).query(ROW).optional()
                .orElseThrow(() -> ApiException.notFound("미등록 차량입니다. VIN을 확인해 주세요."));
    }

    public Optional<VehicleInfo> find(String vehicleId) {
        return jdbc.sql(SELECT + " WHERE v.id = ?").param(vehicleId).query(ROW).optional();
    }

    public VehicleInfo get(String vehicleId) {
        return find(vehicleId).orElseThrow(() -> ApiException.notFound("등록되지 않은 차량입니다."));
    }

    /** 시연 차량만 VIN을 돌려준다 (작업 목록에서 차량을 다시 고르기 위해) */
    public Optional<String> demoVin(String vehicleId) {
        return jdbc.sql("SELECT demo_vin FROM production.vehicle WHERE id = ? AND demo_vin IS NOT NULL").param(vehicleId).query(String.class).optional();
    }

    /** 사양(profile) id → 차종 이름. 다른 차종 절차 비교에 쓴다 */
    public String modelOf(String profileId) {
        return jdbc.sql("SELECT model FROM production.vehicle_profile WHERE id = ?").param(profileId).query(String.class).optional().orElse(profileId);
    }

    List<DemoVehicle> demoVehicles() {
        return jdbc.sql("""
                SELECT v.demo_vin, v.id, p.model, p.body_summary FROM production.vehicle v
                JOIN production.vehicle_profile p ON p.id = v.profile_id
                WHERE v.data_origin = 'DEMO' AND v.demo_vin IS NOT NULL ORDER BY v.demo_vin
                """).query((rs, i) -> new DemoVehicle(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), true)).list();
    }

    private String hmac(String vin) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            return HexFormat.of().formatHex(mac.doFinal(vin.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
