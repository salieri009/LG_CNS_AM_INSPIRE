-- 컨테이너를 처음 만들 때 한 번 실행된다 (볼륨이 비어 있을 때만).
-- 모듈러 모놀리스라 앱 계정 하나가 모든 스키마를 쓰고, 모듈 경계는 코드(Spring Modulith 테스트)로 지킨다.
-- 서비스를 나눌 때 스키마별 계정으로 바꾼다 (docs/deployment-eks.md).
CREATE DATABASE IF NOT EXISTS auth       CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS production CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS diagnosis  CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS guide      CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS knowledge  CHARACTER SET utf8mb4;
CREATE DATABASE IF NOT EXISTS record     CHARACTER SET utf8mb4;
GRANT ALL PRIVILEGES ON auth.*       TO 'repair'@'%';
GRANT ALL PRIVILEGES ON production.* TO 'repair'@'%';
GRANT ALL PRIVILEGES ON diagnosis.*  TO 'repair'@'%';
GRANT ALL PRIVILEGES ON guide.*      TO 'repair'@'%';
GRANT ALL PRIVILEGES ON knowledge.*  TO 'repair'@'%';
GRANT ALL PRIVILEGES ON record.*     TO 'repair'@'%';
FLUSH PRIVILEGES;
