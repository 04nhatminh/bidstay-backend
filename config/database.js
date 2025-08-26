require('dotenv').config();
const mysql = require('mysql2/promise');
const { spawn } = require('child_process');
const path = require('path');
const { create } = require('domain');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3308,
    password: process.env.DB_PASSWORD || '22127007', 
    database: process.env.DB_NAME || 'a2airbnb',
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    supportBigNumbers: true,
    bigNumberStrings: true
};

console.log('🔍 Database config:', {
    host: dbConfig.host,
    user: dbConfig.user,
    port: dbConfig.port,
    password: dbConfig.password ? '***hidden***' : 'empty',
    database: dbConfig.database
});

const pool = mysql.createPool(dbConfig);

pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+07:00'");
  conn.query("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION,ONLY_FULL_GROUP_BY'");
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Kết nối MySQL thành công!');
        connection.release();
    } catch (error) {
        console.error('❌ Lỗi kết nối MySQL:', error.message);
    }
}

async function createSystemParametersTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS SystemParameters (
            ParamID INT PRIMARY KEY AUTO_INCREMENT,
            ParamName VARCHAR(255) NOT NULL,
            ParamValue VARCHAR(255) NOT NULL
        )
    `);
}

async function createAdministrativeRegionsTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS AdministrativeRegions (
            RegionID INT PRIMARY KEY,
            Name VARCHAR(255) NOT NULL,
            NameEn VARCHAR(255) NOT NULL,
            CodeName VARCHAR(255),
            CodeNameEn VARCHAR(255)
        )
    `);

    await pool.execute(`
        INSERT INTO AdministrativeRegions(RegionID, Name, NameEn, CodeName, CodeNameEn) 
        VALUES(1,'Đông Bắc Bộ','Northeast','dong_bac_bo','northest'),
        (2,'Tây Bắc Bộ','Northwest','tay_bac_bo','northwest'),
        (3,'Đồng bằng sông Hồng','Red River Delta','dong_bang_song_hong','red_river_delta'),
        (4,'Bắc Trung Bộ','North Central Coast','bac_trung_bo','north_central_coast'),
        (5,'Duyên hải Nam Trung Bộ','South Central Coast','duyen_hai_nam_trung_bo','south_central_coast'),
        (6,'Tây Nguyên','Central Highlands','tay_nguyen','central_highlands'),
        (7,'Đông Nam Bộ','Southeast','dong_nam_bo','southeast'),
        (8,'Đồng bằng sông Cửu Long','Mekong River Delta','dong_bang_song_cuu_long','southwest')
        ON DUPLICATE KEY UPDATE
            Name = VALUES(Name),
            NameEn = VALUES(NameEn),
            CodeName = VALUES(CodeName),
            CodeNameEn = VALUES(CodeNameEn)
    `);
}

async function createAdministrativeUnitsTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS AdministrativeUnits (
            UnitID INT PRIMARY KEY,
            FullName VARCHAR(255),
            FullNameEn VARCHAR(255),
            ShortName VARCHAR(255),
            ShortNameEn VARCHAR(255),
            CodeName VARCHAR(255),
            CodeNameEn VARCHAR(255)
        )
    `);

    await pool.execute(`
        INSERT INTO AdministrativeUnits(UnitID, FullName, FullNameEn, ShortName, ShortNameEn, CodeName, CodeNameEn) VALUES
        (1,'Thành phố trực thuộc trung ương','Municipality','Thành phố','City','thanh_pho_truc_thuoc_trung_uong','municipality'),
        (2,'Tỉnh','Province','Tỉnh','Province','tinh','province'),
        (3,'Thành phố thuộc thành phố trực thuộc trung ương','Municipal city','Thành phố','City','thanh_pho_thuoc_thanh_pho_truc_thuoc_trung_uong','municipal_city'),
        (4,'Thành phố thuộc tỉnh','Provincial city','Thành phố','City','thanh_pho_thuoc_tinh','provincial_city'),
        (5,'Quận','Urban district','Quận','District','quan','urban_district'),
        (6,'Thị xã','District-level town','Thị xã','Town','thi_xa','district_level_town'),
        (7,'Huyện','District','Huyện','District','huyen','district'),
        (8,'Phường','Ward','Phường','Ward','phuong','ward'),
        (9,'Thị trấn','Commune-level town','Thị trấn','Township','thi_tran','commune_level_town'),
        (10,'Xã','Commune','Xã','Commune','xa','commune')
        ON DUPLICATE KEY UPDATE
            FullName = VALUES(FullName),
            FullNameEn = VALUES(FullNameEn),
            ShortName = VALUES(ShortName),
            ShortNameEn = VALUES(ShortNameEn),
            CodeName = VALUES(CodeName),
            CodeNameEn = VALUES(CodeNameEn)
    `);
}

async function createProvincesTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Provinces (
            ProvinceCode VARCHAR(20) PRIMARY KEY,
            Name VARCHAR(255) NOT NULL,
            NameEn VARCHAR(255),
            FullName VARCHAR(255),
            FullNameEn VARCHAR(255),
            CodeName VARCHAR(255),
            AdministrativeUnitID INT,
            AdministrativeRegionID INT,
            FOREIGN KEY (AdministrativeUnitID) REFERENCES AdministrativeUnits(UnitID),
            FOREIGN KEY (AdministrativeRegionID) REFERENCES AdministrativeRegions(RegionID)
        )
    `);

    await pool.execute(`
        INSERT INTO Provinces(ProvinceCode, Name, NameEn, FullName, FullNameEn, CodeName, AdministrativeUnitID, AdministrativeRegionID) VALUES
            ('01','Hà Nội','Ha Noi','Thành phố Hà Nội','Ha Noi City','ha_noi',1,3),
            ('02','Hà Giang','Ha Giang','Tỉnh Hà Giang','Ha Giang Province','ha_giang',2,1),
            ('04','Cao Bằng','Cao Bang','Tỉnh Cao Bằng','Cao Bang Province','cao_bang',2,1),
            ('06','Bắc Kạn','Bac Kan','Tỉnh Bắc Kạn','Bac Kan Province','bac_kan',2,1),
            ('08','Tuyên Quang','Tuyen Quang','Tỉnh Tuyên Quang','Tuyen Quang Province','tuyen_quang',2,1),
            ('10','Lào Cai','Lao Cai','Tỉnh Lào Cai','Lao Cai Province','lao_cai',2,2),
            ('11','Điện Biên','Dien Bien','Tỉnh Điện Biên','Dien Bien Province','dien_bien',2,2),
            ('12','Lai Châu','Lai Chau','Tỉnh Lai Châu','Lai Chau Province','lai_chau',2,2),
            ('14','Sơn La','Son La','Tỉnh Sơn La','Son La Province','son_la',2,2),
            ('15','Yên Bái','Yen Bai','Tỉnh Yên Bái','Yen Bai Province','yen_bai',2,2),
            ('17','Hòa Bình','Hoa Binh','Tỉnh Hòa Bình','Hoa Binh Province','hoa_binh',2,2),
            ('19','Thái Nguyên','Thai Nguyen','Tỉnh Thái Nguyên','Thai Nguyen Province','thai_nguyen',2,1),
            ('20','Lạng Sơn','Lang Son','Tỉnh Lạng Sơn','Lang Son Province','lang_son',2,1),
            ('22','Quảng Ninh','Quang Ninh','Tỉnh Quảng Ninh','Quang Ninh Province','quang_ninh',2,1),
            ('24','Bắc Giang','Bac Giang','Tỉnh Bắc Giang','Bac Giang Province','bac_giang',2,1),
            ('25','Phú Thọ','Phu Tho','Tỉnh Phú Thọ','Phu Tho Province','phu_tho',2,1),
            ('26','Vĩnh Phúc','Vinh Phuc','Tỉnh Vĩnh Phúc','Vinh Phuc Province','vinh_phuc',2,3),
            ('27','Bắc Ninh','Bac Ninh','Tỉnh Bắc Ninh','Bac Ninh Province','bac_ninh',2,3),
            ('30','Hải Dương','Hai Duong','Tỉnh Hải Dương','Hai Duong Province','hai_duong',2,3),
            ('31','Hải Phòng','Hai Phong','Thành phố Hải Phòng','Hai Phong City','hai_phong',1,3),
            ('33','Hưng Yên','Hung Yen','Tỉnh Hưng Yên','Hung Yen Province','hung_yen',2,3),
            ('34','Thái Bình','Thai Binh','Tỉnh Thái Bình','Thai Binh Province','thai_binh',2,3),
            ('35','Hà Nam','Ha Nam','Tỉnh Hà Nam','Ha Nam Province','ha_nam',2,3),
            ('36','Nam Định','Nam Dinh','Tỉnh Nam Định','Nam Dinh Province','nam_dinh',2,3),
            ('37','Ninh Bình','Ninh Binh','Tỉnh Ninh Bình','Ninh Binh Province','ninh_binh',2,3),
            ('38','Thanh Hóa','Thanh Hoa','Tỉnh Thanh Hóa','Thanh Hoa Province','thanh_hoa',2,4),
            ('40','Nghệ An','Nghe An','Tỉnh Nghệ An','Nghe An Province','nghe_an',2,4),
            ('42','Hà Tĩnh','Ha Tinh','Tỉnh Hà Tĩnh','Ha Tinh Province','ha_tinh',2,4),
            ('44','Quảng Bình','Quang Binh','Tỉnh Quảng Bình','Quang Binh Province','quang_binh',2,4),
            ('45','Quảng Trị','Quang Tri','Tỉnh Quảng Trị','Quang Tri Province','quang_tri',2,4),
            ('46','Huế','Hue','Thành phố Huế','Hue City','hue',1,4),
            ('48','Đà Nẵng','Da Nang','Thành phố Đà Nẵng','Da Nang City','da_nang',1,5),
            ('49','Quảng Nam','Quang Nam','Tỉnh Quảng Nam','Quang Nam Province','quang_nam',2,5),
            ('51','Quảng Ngãi','Quang Ngai','Tỉnh Quảng Ngãi','Quang Ngai Province','quang_ngai',2,5),
            ('52','Bình Định','Binh Dinh','Tỉnh Bình Định','Binh Dinh Province','binh_dinh',2,5),
            ('54','Phú Yên','Phu Yen','Tỉnh Phú Yên','Phu Yen Province','phu_yen',2,5),
            ('56','Khánh Hòa','Khanh Hoa','Tỉnh Khánh Hòa','Khanh Hoa Province','khanh_hoa',2,5),
            ('58','Ninh Thuận','Ninh Thuan','Tỉnh Ninh Thuận','Ninh Thuan Province','ninh_thuan',2,5),
            ('60','Bình Thuận','Binh Thuan','Tỉnh Bình Thuận','Binh Thuan Province','binh_thuan',2,5),
            ('62','Kon Tum','Kon Tum','Tỉnh Kon Tum','Kon Tum Province','kon_tum',2,6),
            ('64','Gia Lai','Gia Lai','Tỉnh Gia Lai','Gia Lai Province','gia_lai',2,6),
            ('66','Đắk Lắk','Dak Lak','Tỉnh Đắk Lắk','Dak Lak Province','dak_lak',2,6),
            ('67','Đắk Nông','Dak Nong','Tỉnh Đắk Nông','Dak Nong Province','dak_nong',2,6),
            ('68','Lâm Đồng','Lam Dong','Tỉnh Lâm Đồng','Lam Dong Province','lam_dong',2,6),
            ('70','Bình Phước','Binh Phuoc','Tỉnh Bình Phước','Binh Phuoc Province','binh_phuoc',2,7),
            ('72','Tây Ninh','Tay Ninh','Tỉnh Tây Ninh','Tay Ninh Province','tay_ninh',2,7),
            ('74','Bình Dương','Binh Duong','Tỉnh Bình Dương','Binh Duong Province','binh_duong',2,7),
            ('75','Đồng Nai','Dong Nai','Tỉnh Đồng Nai','Dong Nai Province','dong_nai',2,7),
            ('77','Bà Rịa - Vũng Tàu','Ba Ria - Vung Tau','Tỉnh Bà Rịa - Vũng Tàu','Ba Ria - Vung Tau Province','ba_ria_vung_tau',2,7),
            ('79','Hồ Chí Minh','Ho Chi Minh','Thành phố Hồ Chí Minh','Ho Chi Minh City','ho_chi_minh',1,7),
            ('80','Long An','Long An','Tỉnh Long An','Long An Province','long_an',2,8),
            ('82','Tiền Giang','Tien Giang','Tỉnh Tiền Giang','Tien Giang Province','tien_giang',2,8),
            ('83','Bến Tre','Ben Tre','Tỉnh Bến Tre','Ben Tre Province','ben_tre',2,8),
            ('84','Trà Vinh','Tra Vinh','Tỉnh Trà Vinh','Tra Vinh Province','tra_vinh',2,8),
            ('86','Vĩnh Long','Vinh Long','Tỉnh Vĩnh Long','Vinh Long Province','vinh_long',2,8),
            ('87','Đồng Tháp','Dong Thap','Tỉnh Đồng Tháp','Dong Thap Province','dong_thap',2,8),
            ('89','An Giang','An Giang','Tỉnh An Giang','An Giang Province','an_giang',2,8),
            ('91','Kiên Giang','Kien Giang','Tỉnh Kiên Giang','Kien Giang Province','kien_giang',2,8),
            ('92','Cần Thơ','Can Tho','Thành phố Cần Thơ','Can Tho City','can_tho',1,8),
            ('93','Hậu Giang','Hau Giang','Tỉnh Hậu Giang','Hau Giang Province','hau_giang',2,8),
            ('94','Sóc Trăng','Soc Trang','Tỉnh Sóc Trăng','Soc Trang Province','soc_trang',2,8),
            ('95','Bạc Liêu','Bac Lieu','Tỉnh Bạc Liêu','Bac Lieu Province','bac_lieu',2,8),
            ('96','Cà Mau','Ca Mau','Tỉnh Cà Mau','Ca Mau Province','ca_mau',2,8) 
            ON DUPLICATE KEY UPDATE Name=VALUES(Name);
    `);
    
    // Tạo index với error handling
    try {
        await pool.execute(`CREATE INDEX idx_Provinces_Region ON Provinces(AdministrativeRegionID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') {
            throw error; // Re-throw nếu không phải lỗi duplicate key
        }
    }
    
    try {
        await pool.execute(`CREATE INDEX idx_Provinces_Unit ON Provinces(AdministrativeUnitID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') {
            throw error;
        }
    }
}

async function createDistrictsTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Districts (
            DistrictCode VARCHAR(20) PRIMARY KEY,
            Name VARCHAR(255) NOT NULL,
            NameEn VARCHAR(255),
            FullName VARCHAR(255),
            FullNameEn VARCHAR(255),
            CodeName VARCHAR(255),
            ProvinceCode VARCHAR(20),
            AdministrativeUnitID INT,
            FOREIGN KEY (ProvinceCode) REFERENCES Provinces(ProvinceCode),
            FOREIGN KEY (AdministrativeUnitID) REFERENCES AdministrativeUnits(UnitID)
        )
    `);
    
    // Chia thành nhiều lần INSERT để tránh quá giới hạn câu lệnh
    await pool.execute(`
        INSERT INTO Districts(DistrictCode, Name, NameEn, FullName, FullNameEn, CodeName, ProvinceCode, AdministrativeUnitID) VALUES
            ('001','Ba Đình','Ba Dinh','Quận Ba Đình','Ba Dinh District','ba_dinh','01',5),
            ('002','Hoàn Kiếm','Hoan Kiem','Quận Hoàn Kiếm','Hoan Kiem District','hoan_kiem','01',5),
            ('003','Tây Hồ','Tay Ho','Quận Tây Hồ','Tay Ho District','tay_ho','01',5),
            ('004','Long Biên','Long Bien','Quận Long Biên','Long Bien District','long_bien','01',5),
            ('005','Cầu Giấy','Cau Giay','Quận Cầu Giấy','Cau Giay District','cau_giay','01',5),
            ('006','Đống Đa','Dong Da','Quận Đống Đa','Dong Da District','dong_da','01',5),
            ('007','Hai Bà Trưng','Hai Ba Trung','Quận Hai Bà Trưng','Hai Ba Trung District','hai_ba_trung','01',5),
            ('008','Hoàng Mai','Hoang Mai','Quận Hoàng Mai','Hoang Mai District','hoang_mai','01',5),
            ('009','Thanh Xuân','Thanh Xuan','Quận Thanh Xuân','Thanh Xuan District','thanh_xuan','01',5),
            ('016','Sóc Sơn','Soc Son','Huyện Sóc Sơn','Soc Son District','soc_son','01',7),
            ('017','Đông Anh','Dong Anh','Huyện Đông Anh','Dong Anh District','dong_anh','01',7),
            ('018','Gia Lâm','Gia Lam','Huyện Gia Lâm','Gia Lam District','gia_lam','01',7),
            ('019','Nam Từ Liêm','Nam Tu Liem','Quận Nam Từ Liêm','Nam Tu Liem District','nam_tu_liem','01',5),
            ('020','Thanh Trì','Thanh Tri','Huyện Thanh Trì','Thanh Tri District','thanh_tri','01',7),
            ('021','Bắc Từ Liêm','Bac Tu Liem','Quận Bắc Từ Liêm','Bac Tu Liem District','bac_tu_liem','01',5),
            ('250','Mê Linh','Me Linh','Huyện Mê Linh','Me Linh District','me_linh','01',7),
            ('268','Hà Đông','Ha Dong','Quận Hà Đông','Ha Dong District','ha_dong','01',5),
            ('269','Sơn Tây','Son Tay','Thị xã Sơn Tây','Son Tay Town','son_tay','01',6),
            ('271','Ba Vì','Ba Vi','Huyện Ba Vì','Ba Vi District','ba_vi','01',7),
            ('272','Phúc Thọ','Phuc Tho','Huyện Phúc Thọ','Phuc Tho District','phuc_tho','01',7),
            ('273','Đan Phượng','Dan Phuong','Huyện Đan Phượng','Dan Phuong District','dan_phuong','01',7),
            ('274','Hoài Đức','Hoai Duc','Huyện Hoài Đức','Hoai Duc District','hoai_duc','01',7),
            ('275','Quốc Oai','Quoc Oai','Huyện Quốc Oai','Quoc Oai District','quoc_oai','01',7),
            ('276','Thạch Thất','Thach That','Huyện Thạch Thất','Thach That District','thach_that','01',7),
            ('277','Chương Mỹ','Chuong My','Huyện Chương Mỹ','Chuong My District','chuong_my','01',7),
            ('278','Thanh Oai','Thanh Oai','Huyện Thanh Oai','Thanh Oai District','thanh_oai','01',7),
            ('279','Thường Tín','Thuong Tin','Huyện Thường Tín','Thuong Tin District','thuong_tin','01',7),
            ('280','Phú Xuyên','Phu Xuyen','Huyện Phú Xuyên','Phu Xuyen District','phu_xuyen','01',7),
            ('281','Ứng Hòa','Ung Hoa','Huyện Ứng Hòa','Ung Hoa District','ung_hoa','01',7),
            ('282','Mỹ Đức','My Duc','Huyện Mỹ Đức','My Duc District','my_duc','01',7),
            ('024','Hà Giang','Ha Giang','Thành phố Hà Giang','Ha Giang City','ha_giang','02',4),
            ('026','Đồng Văn','Dong Van','Huyện Đồng Văn','Dong Van District','dong_van','02',7),
            ('027','Mèo Vạc','Meo Vac','Huyện Mèo Vạc','Meo Vac District','meo_vac','02',7),
            ('028','Yên Minh','Yen Minh','Huyện Yên Minh','Yen Minh District','yen_minh','02',7),
            ('029','Quản Bạ','Quan Ba','Huyện Quản Bạ','Quan Ba District','quan_ba','02',7),
            ('030','Vị Xuyên','Vi Xuyen','Huyện Vị Xuyên','Vi Xuyen District','vi_xuyen','02',7),
            ('031','Bắc Mê','Bac Me','Huyện Bắc Mê','Bac Me District','bac_me','02',7),
            ('032','Hoàng Su Phì','Hoang Su Phi','Huyện Hoàng Su Phì','Hoang Su Phi District','hoang_su_phi','02',7),
            ('033','Xín Mần','Xin Man','Huyện Xín Mần','Xin Man District','xin_man','02',7),
            ('034','Bắc Quang','Bac Quang','Huyện Bắc Quang','Bac Quang District','bac_quang','02',7),
            ('035','Quang Bình','Quang Binh','Huyện Quang Bình','Quang Binh District','quang_binh','02',7),
            ('040','Cao Bằng','Cao Bang','Thành phố Cao Bằng','Cao Bang City','cao_bang','04',4),
            ('042','Bảo Lâm','Bao Lam','Huyện Bảo Lâm','Bao Lam District','bao_lam','04',7),
            ('043','Bảo Lạc','Bao Lac','Huyện Bảo Lạc','Bao Lac District','bao_lac','04',7),
            ('045','Hà Quảng','Ha Quang','Huyện Hà Quảng','Ha Quang District','ha_quang','04',7),
            ('047','Trùng Khánh','Trung Khanh','Huyện Trùng Khánh','Trung Khanh District','trung_khanh','04',7),
            ('048','Hạ Lang','Ha Lang','Huyện Hạ Lang','Ha Lang District','ha_lang','04',7),
            ('049','Quảng Hòa','Quang Hoa','Huyện Quảng Hòa','Quang Hoa District','quang_hoa','04',7),
            ('051','Hòa An','Hoa An','Huyện Hòa An','Hoa An District','hoa_an','04',7),
            ('052','Nguyên Bình','Nguyen Binh','Huyện Nguyên Bình','Nguyen Binh District','nguyen_binh','04',7)
        ON DUPLICATE KEY UPDATE
            Name                 = VALUES(Name),
            NameEn               = VALUES(NameEn),
            FullName             = VALUES(FullName),
            FullNameEn           = VALUES(FullNameEn),
            CodeName             = VALUES(CodeName),
            ProvinceCode         = VALUES(ProvinceCode),
            AdministrativeUnitID = VALUES(AdministrativeUnitID)
    `);

    await pool.execute(`
        INSERT INTO Districts(DistrictCode, Name, NameEn, FullName, FullNameEn, CodeName, ProvinceCode, AdministrativeUnitID) VALUES
            ('053','Thạch An','Thach An','Huyện Thạch An','Thach An District','thach_an','04',7),
            ('058','Bắc Kạn','Bac Kan','Thành phố Bắc Kạn','Bac Kan City','bac_kan','06',4),
            ('060','Pác Nặm','Pac Nam','Huyện Pác Nặm','Pac Nam District','pac_nam','06',7),
            ('061','Ba Bể','Ba Be','Huyện Ba Bể','Ba Be District','ba_be','06',7),
            ('062','Ngân Sơn','Ngan Son','Huyện Ngân Sơn','Ngan Son District','ngan_son','06',7),
            ('063','Bạch Thông','Bach Thong','Huyện Bạch Thông','Bach Thong District','bach_thong','06',7),
            ('064','Chợ Đồn','Cho Don','Huyện Chợ Đồn','Cho Don District','cho_don','06',7),
            ('065','Chợ Mới','Cho Moi','Huyện Chợ Mới','Cho Moi District','cho_moi','06',7),
            ('066','Na Rì','Na Ri','Huyện Na Rì','Na Ri District','na_ri','06',7),
            ('070','Tuyên Quang','Tuyen Quang','Thành phố Tuyên Quang','Tuyen Quang City','tuyen_quang','08',4),
            ('071','Lâm Bình','Lam Binh','Huyện Lâm Bình','Lam Binh District','lam_binh','08',7),
            ('072','Na Hang','Na Hang','Huyện Na Hang','Na Hang District','na_hang','08',7),
            ('073','Chiêm Hóa','Chiem Hoa','Huyện Chiêm Hóa','Chiem Hoa District','chiem_hoa','08',7),
            ('074','Hàm Yên','Ham Yen','Huyện Hàm Yên','Ham Yen District','ham_yen','08',7),
            ('075','Yên Sơn','Yen Son','Huyện Yên Sơn','Yen Son District','yen_son','08',7),
            ('076','Sơn Dương','Son Duong','Huyện Sơn Dương','Son Duong District','son_duong','08',7),
            ('080','Lào Cai','Lao Cai','Thành phố Lào Cai','Lao Cai City','lao_cai','10',4),
            ('082','Bát Xát','Bat Xat','Huyện Bát Xát','Bat Xat District','bat_xat','10',7),
            ('083','Mường Khương','Muong Khuong','Huyện Mường Khương','Muong Khuong District','muong_khuong','10',7),
            ('084','Si Ma Cai','Si Ma Cai','Huyện Si Ma Cai','Si Ma Cai District','si_ma_cai','10',7),
            ('085','Bắc Hà','Bac Ha','Huyện Bắc Hà','Bac Ha District','bac_ha','10',7),
            ('086','Bảo Thắng','Bao Thang','Huyện Bảo Thắng','Bao Thang District','bao_thang','10',7),
            ('087','Bảo Yên','Bao Yen','Huyện Bảo Yên','Bao Yen District','bao_yen','10',7),
            ('088','Sa Pa','Sa Pa','Thị xã Sa Pa','Sa Pa Town','sa_pa','10',6),
            ('089','Văn Bàn','Van Ban','Huyện Văn Bàn','Van Ban District','van_ban','10',7),
            ('094','Điện Biên Phủ','Dien Bien Phu','Thành phố Điện Biên Phủ','Dien Bien Phu City','dien_bien_phu','11',4),
            ('095','Mường Lay','Muong Lay','Thị xã Mường Lay','Muong Lay Town','muong_lay','11',6),
            ('096','Mường Nhé','Muong Nhe','Huyện Mường Nhé','Muong Nhe District','muong_nhe','11',7),
            ('097','Mường Chà','Muong Cha','Huyện Mường Chà','Muong Cha District','muong_cha','11',7),
            ('098','Tủa Chùa','Tua Chua','Huyện Tủa Chùa','Tua Chua District','tua_chua','11',7),
            ('099','Tuần Giáo','Tuan Giao','Huyện Tuần Giáo','Tuan Giao District','tuan_giao','11',7),
            ('100','Điện Biên','Dien Bien','Huyện Điện Biên','Dien Bien District','dien_bien','11',7),
            ('101','Điện Biên Đông','Dien Bien Dong','Huyện Điện Biên Đông','Dien Bien Dong District','dien_bien_dong','11',7),
            ('102','Mường Ảng','Muong Ang','Huyện Mường Ảng','Muong Ang District','muong_ang','11',7),
            ('103','Nậm Pồ','Nam Po','Huyện Nậm Pồ','Nam Po District','nam_po','11',7),
            ('105','Lai Châu','Lai Chau','Thành phố Lai Châu','Lai Chau City','lai_chau','12',4),
            ('106','Tam Đường','Tam Duong','Huyện Tam Đường','Tam Duong District','tam_duong','12',7),
            ('107','Mường Tè','Muong Te','Huyện Mường Tè','Muong Te District','muong_te','12',7),
            ('108','Sìn Hồ','Sin Ho','Huyện Sìn Hồ','Sin Ho District','sin_ho','12',7),
            ('109','Phong Thổ','Phong Tho','Huyện Phong Thổ','Phong Tho District','phong_tho','12',7),
            ('110','Than Uyên','Than Uyen','Huyện Than Uyên','Than Uyen District','than_uyen','12',7),
            ('111','Tân Uyên','Tan Uyen','Huyện Tân Uyên','Tan Uyen District','tan_uyen','12',7),
            ('112','Nậm Nhùn','Nam Nhun','Huyện Nậm Nhùn','Nam Nhun District','nam_nhun','12',7),
            ('116','Sơn La','Son La','Thành phố Sơn La','Son La City','son_la','14',4),
            ('118','Quỳnh Nhai','Quynh Nhai','Huyện Quỳnh Nhai','Quynh Nhai District','quynh_nhai','14',7),
            ('119','Thuận Châu','Thuan Chau','Huyện Thuận Châu','Thuan Chau District','thuan_chau','14',7),
            ('120','Mường La','Muong La','Huyện Mường La','Muong La District','muong_la','14',7),
            ('121','Bắc Yên','Bac Yen','Huyện Bắc Yên','Bac Yen District','bac_yen','14',7),
            ('122','Phù Yên','Phu Yen','Huyện Phù Yên','Phu Yen District','phu_yen','14',7),
            ('123','Mộc Châu','Moc Chau','Thị xã Mộc Châu','Moc Chau Town','moc_chau','14',6),
            ('124','Yên Châu','Yen Chau','Huyện Yên Châu','Yen Chau District','yen_chau','14',7),
            ('125','Mai Sơn','Mai Son','Huyện Mai Sơn','Mai Son District','mai_son','14',7),
            ('126','Sông Mã','Song Ma','Huyện Sông Mã','Song Ma District','song_ma','14',7),
            ('127','Sốp Cộp','Sop Cop','Huyện Sốp Cộp','Sop Cop District','sop_cop','14',7),
            ('128','Vân Hồ','Van Ho','Huyện Vân Hồ','Van Ho District','van_ho','14',7),
            ('132','Yên Bái','Yen Bai','Thành phố Yên Bái','Yen Bai City','yen_bai','15',4),
            ('133','Nghĩa Lộ','Nghia Lo','Thị xã Nghĩa Lộ','Nghia Lo Town','nghia_lo','15',6),
            ('135','Lục Yên','Luc Yen','Huyện Lục Yên','Luc Yen District','luc_yen','15',7),
            ('136','Văn Yên','Van Yen','Huyện Văn Yên','Van Yen District','van_yen','15',7),
            ('137','Mù Căng Chải','Mu Cang Chai','Huyện Mù Căng Chải','Mu Cang Chai District','mu_cang_chai','15',7),
            ('138','Trấn Yên','Tran Yen','Huyện Trấn Yên','Tran Yen District','tran_yen','15',7),
            ('139','Trạm Tấu','Tram Tau','Huyện Trạm Tấu','Tram Tau District','tram_tau','15',7),
            ('140','Văn Chấn','Van Chan','Huyện Văn Chấn','Van Chan District','van_chan','15',7),
            ('141','Yên Bình','Yen Binh','Huyện Yên Bình','Yen Binh District','yen_binh','15',7),
            ('148','Hòa Bình','Hoa Binh','Thành phố Hòa Bình','Hoa Binh City','hoa_binh','17',4),
            ('150','Đà Bắc','Da Bac','Huyện Đà Bắc','Da Bac District','da_bac','17',7),
            ('152','Lương Sơn','Luong Son','Huyện Lương Sơn','Luong Son District','luong_son','17',7),
            ('153','Kim Bôi','Kim Boi','Huyện Kim Bôi','Kim Boi District','kim_boi','17',7),
            ('154','Cao Phong','Cao Phong','Huyện Cao Phong','Cao Phong District','cao_phong','17',7),
            ('155','Tân Lạc','Tan Lac','Huyện Tân Lạc','Tan Lac District','tan_lac','17',7),
            ('156','Mai Châu','Mai Chau','Huyện Mai Châu','Mai Chau District','mai_chau','17',7),
            ('157','Lạc Sơn','Lac Son','Huyện Lạc Sơn','Lac Son District','lac_son','17',7),
            ('158','Yên Thủy','Yen Thuy','Huyện Yên Thủy','Yen Thuy District','yen_thuy','17',7),
            ('159','Lạc Thủy','Lac Thuy','Huyện Lạc Thủy','Lac Thuy District','lac_thuy','17',7),
            ('164','Thái Nguyên','Thai Nguyen','Thành phố Thái Nguyên','Thai Nguyen City','thai_nguyen','19',4),
            ('165','Sông Công','Song Cong','Thành phố Sông Công','Song Cong City','song_cong','19',4),
            ('167','Định Hóa','Dinh Hoa','Huyện Định Hóa','Dinh Hoa District','dinh_hoa','19',7),
            ('168','Phú Lương','Phu Luong','Huyện Phú Lương','Phu Luong District','phu_luong','19',7),
            ('169','Đồng Hỷ','Dong Hy','Huyện Đồng Hỷ','Dong Hy District','dong_hy','19',7),
            ('170','Võ Nhai','Vo Nhai','Huyện Võ Nhai','Vo Nhai District','vo_nhai','19',7),
            ('171','Đại Từ','Dai Tu','Huyện Đại Từ','Dai Tu District','dai_tu','19',7),
            ('172','Phổ Yên','Pho Yen','Thành phố Phổ Yên','Pho Yen City','pho_yen','19',4),
            ('173','Phú Bình','Phu Binh','Huyện Phú Bình','Phu Binh District','phu_binh','19',7),
            ('178','Lạng Sơn','Lang Son','Thành phố Lạng Sơn','Lang Son City','lang_son','20',4),
            ('180','Tràng Định','Trang Dinh','Huyện Tràng Định','Trang Dinh District','trang_dinh','20',7),
            ('181','Bình Gia','Binh Gia','Huyện Bình Gia','Binh Gia District','binh_gia','20',7),
            ('182','Văn Lãng','Van Lang','Huyện Văn Lãng','Van Lang District','van_lang','20',7),
            ('183','Cao Lộc','Cao Loc','Huyện Cao Lộc','Cao Loc District','cao_loc','20',7),
            ('184','Văn Quan','Van Quan','Huyện Văn Quan','Van Quan District','van_quan','20',7),
            ('185','Bắc Sơn','Bac Son','Huyện Bắc Sơn','Bac Son District','bac_son','20',7),
            ('186','Hữu Lũng','Huu Lung','Huyện Hữu Lũng','Huu Lung District','huu_lung','20',7),
            ('187','Chi Lăng','Chi Lang','Huyện Chi Lăng','Chi Lang District','chi_lang','20',7),
            ('188','Lộc Bình','Loc Binh','Huyện Lộc Bình','Loc Binh District','loc_binh','20',7),
            ('189','Đình Lập','Dinh Lap','Huyện Đình Lập','Dinh Lap District','dinh_lap','20',7),
            ('193','Hạ Long','Ha Long','Thành phố Hạ Long','Ha Long City','ha_long','22',4),
            ('194','Móng Cái','Mong Cai','Thành phố Móng Cái','Mong Cai City','mong_cai','22',4),
            ('195','Cẩm Phả','Cam Pha','Thành phố Cẩm Phả','Cam Pha City','cam_pha','22',4),
            ('196','Uông Bí','Uong Bi','Thành phố Uông Bí','Uong Bi City','uong_bi','22',4),
            ('198','Bình Liêu','Binh Lieu','Huyện Bình Liêu','Binh Lieu District','binh_lieu','22',7),
            ('199','Tiên Yên','Tien Yen','Huyện Tiên Yên','Tien Yen District','tien_yen','22',7)
        ON DUPLICATE KEY UPDATE
            Name                 = VALUES(Name),
            NameEn               = VALUES(NameEn),
            FullName             = VALUES(FullName),
            FullNameEn           = VALUES(FullNameEn),
            CodeName             = VALUES(CodeName),
            ProvinceCode         = VALUES(ProvinceCode),
            AdministrativeUnitID = VALUES(AdministrativeUnitID)
    `);

    await pool.execute(`
        INSERT INTO Districts(DistrictCode, Name, NameEn, FullName, FullNameEn, CodeName, ProvinceCode, AdministrativeUnitID) VALUES
            ('200','Đầm Hà','Dam Ha','Huyện Đầm Hà','Dam Ha District','dam_ha','22',7),
            ('201','Hải Hà','Hai Ha','Huyện Hải Hà','Hai Ha District','hai_ha','22',7),
            ('202','Ba Chẽ','Ba Che','Huyện Ba Chẽ','Ba Che District','ba_che','22',7),
            ('203','Vân Đồn','Van Don','Huyện Vân Đồn','Van Don District','van_don','22',7),
            ('205','Đông Triều','Dong Trieu','Thành phố Đông Triều','Dong Trieu City','dong_trieu','22',4),
            ('206','Quảng Yên','Quang Yen','Thị xã Quảng Yên','Quang Yen Town','quang_yen','22',6),
            ('207','Cô Tô','Co To','Huyện Cô Tô','Co To District','co_to','22',7),
            ('213','Bắc Giang','Bac Giang','Thành phố Bắc Giang','Bac Giang City','bac_giang','24',4),
            ('215','Yên Thế','Yen The','Huyện Yên Thế','Yen The District','yen_the','24',7),
            ('216','Tân Yên','Tan Yen','Huyện Tân Yên','Tan Yen District','tan_yen','24',7),
            ('217','Lạng Giang','Lang Giang','Huyện Lạng Giang','Lang Giang District','lang_giang','24',7),
            ('218','Lục Nam','Luc Nam','Huyện Lục Nam','Luc Nam District','luc_nam','24',7),
            ('219','Lục Ngạn','Luc Ngan','Huyện Lục Ngạn','Luc Ngan District','luc_ngan','24',7),
            ('220','Sơn Động','Son Dong','Huyện Sơn Động','Son Dong District','son_dong','24',7),
            ('222','Việt Yên','Viet Yen','Thị xã Việt Yên','Viet Yen Town','viet_yen','24',6),
            ('223','Hiệp Hòa','Hiep Hoa','Huyện Hiệp Hòa','Hiep Hoa District','hiep_hoa','24',7),
            ('224','Chũ','Chu','Thị xã Chũ','Chu Town','chu','24',6),
            ('227','Việt Trì','Viet Tri','Thành phố Việt Trì','Viet Tri City','viet_tri','25',4),
            ('228','Phú Thọ','Phu Tho','Thị xã Phú Thọ','Phu Tho Town','phu_tho','25',6),
            ('230','Đoan Hùng','Doan Hung','Huyện Đoan Hùng','Doan Hung District','doan_hung','25',7),
            ('231','Hạ Hòa','Ha Hoa','Huyện Hạ Hòa','Ha Hoa District','ha_hoa','25',7),
            ('232','Thanh Ba','Thanh Ba','Huyện Thanh Ba','Thanh Ba District','thanh_ba','25',7),
            ('233','Phù Ninh','Phu Ninh','Huyện Phù Ninh','Phu Ninh District','phu_ninh','25',7),
            ('234','Yên Lập','Yen Lap','Huyện Yên Lập','Yen Lap District','yen_lap','25',7),
            ('235','Cẩm Khê','Cam Khe','Huyện Cẩm Khê','Cam Khe District','cam_khe','25',7),
            ('236','Tam Nông','Tam Nong','Huyện Tam Nông','Tam Nong District','tam_nong','25',7),
            ('237','Lâm Thao','Lam Thao','Huyện Lâm Thao','Lam Thao District','lam_thao','25',7),
            ('238','Thanh Sơn','Thanh Son','Huyện Thanh Sơn','Thanh Son District','thanh_son','25',7),
            ('239','Thanh Thuỷ','Thanh Thuy','Huyện Thanh Thuỷ','Thanh Thuy District','thanh_thuy','25',7),
            ('240','Tân Sơn','Tan Son','Huyện Tân Sơn','Tan Son District','tan_son','25',7),
            ('243','Vĩnh Yên','Vinh Yen','Thành phố Vĩnh Yên','Vinh Yen City','vinh_yen','26',4),
            ('244','Phúc Yên','Phuc Yen','Thành phố Phúc Yên','Phuc Yen City','phuc_yen','26',4),
            ('246','Lập Thạch','Lap Thach','Huyện Lập Thạch','Lap Thach District','lap_thach','26',7),
            ('247','Tam Dương','Tam Duong','Huyện Tam Dương','Tam Duong District','tam_duong','26',7),
            ('248','Tam Đảo','Tam Dao','Huyện Tam Đảo','Tam Dao District','tam_dao','26',7),
            ('249','Bình Xuyên','Binh Xuyen','Huyện Bình Xuyên','Binh Xuyen District','binh_xuyen','26',7),
            ('251','Yên Lạc','Yen Lac','Huyện Yên Lạc','Yen Lac District','yen_lac','26',7),
            ('252','Vĩnh Tường','Vinh Tuong','Huyện Vĩnh Tường','Vinh Tuong District','vinh_tuong','26',7),
            ('253','Sông Lô','Song Lo','Huyện Sông Lô','Song Lo District','song_lo','26',7),
            ('256','Bắc Ninh','Bac Ninh','Thành phố Bắc Ninh','Bac Ninh City','bac_ninh','27',4),
            ('258','Yên Phong','Yen Phong','Huyện Yên Phong','Yen Phong District','yen_phong','27',7),
            ('259','Quế Võ','Que Vo','Thị xã Quế Võ','Que Vo Town','que_vo','27',6),
            ('260','Tiên Du','Tien Du','Huyện Tiên Du','Tien Du District','tien_du','27',7),
            ('261','Từ Sơn','Tu Son','Thành phố Từ Sơn','Tu Son City','tu_son','27',4),
            ('262','Thuận Thành','Thuan Thanh','Thị xã Thuận Thành','Thuan Thanh Town','thuan_thanh','27',6),
            ('263','Gia Bình','Gia Binh','Huyện Gia Bình','Gia Binh District','gia_binh','27',7),
            ('264','Lương Tài','Luong Tai','Huyện Lương Tài','Luong Tai District','luong_tai','27',7),
            ('288','Hải Dương','Hai Duong','Thành phố Hải Dương','Hai Duong City','hai_duong','30',4),
            ('290','Chí Linh','Chi Linh','Thành phố Chí Linh','Chi Linh City','chi_linh','30',4),
            ('291','Nam Sách','Nam Sach','Huyện Nam Sách','Nam Sach District','nam_sach','30',7),
            ('292','Kinh Môn','Kinh Mon','Thị xã Kinh Môn','Kinh Mon Town','kinh_mon','30',6),
            ('293','Kim Thành','Kim Thanh','Huyện Kim Thành','Kim Thanh District','kim_thanh','30',7),
            ('294','Thanh Hà','Thanh Ha','Huyện Thanh Hà','Thanh Ha District','thanh_ha','30',7),
            ('295','Cẩm Giàng','Cam Giang','Huyện Cẩm Giàng','Cam Giang District','cam_giang','30',7),
            ('296','Bình Giang','Binh Giang','Huyện Bình Giang','Binh Giang District','binh_giang','30',7),
            ('297','Gia Lộc','Gia Loc','Huyện Gia Lộc','Gia Loc District','gia_loc','30',7),
            ('298','Tứ Kỳ','Tu Ky','Huyện Tứ Kỳ','Tu Ky District','tu_ky','30',7),
            ('299','Ninh Giang','Ninh Giang','Huyện Ninh Giang','Ninh Giang District','ninh_giang','30',7),
            ('300','Thanh Miện','Thanh Mien','Huyện Thanh Miện','Thanh Mien District','thanh_mien','30',7),
            ('303','Hồng Bàng','Hong Bang','Quận Hồng Bàng','Hong Bang District','hong_bang','31',5),
            ('304','Ngô Quyền','Ngo Quyen','Quận Ngô Quyền','Ngo Quyen District','ngo_quyen','31',5),
            ('305','Lê Chân','Le Chan','Quận Lê Chân','Le Chan District','le_chan','31',5),
            ('306','Hải An','Hai An','Quận Hải An','Hai An District','hai_an','31',5),
            ('307','Kiến An','Kien An','Quận Kiến An','Kien An District','kien_an','31',5),
            ('308','Đồ Sơn','Do Son','Quận Đồ Sơn','Do Son District','do_son','31',5),
            ('309','Dương Kinh','Duong Kinh','Quận Dương Kinh','Duong Kinh District','duong_kinh','31',5),
            ('311','Thuỷ Nguyên','Thuy Nguyen','Thành phố Thuỷ Nguyên','Thuy Nguyen City','thuy_nguyen','31',4),
            ('312','An Dương','An Duong','Quận An Dương','An Duong District','an_duong','31',5),
            ('313','An Lão','An Lao','Huyện An Lão','An Lao District','an_lao','31',7),
            ('314','Kiến Thuỵ','Kien Thuy','Huyện Kiến Thuỵ','Kien Thuy District','kien_thuy','31',7),
            ('315','Tiên Lãng','Tien Lang','Huyện Tiên Lãng','Tien Lang District','tien_lang','31',7),
            ('316','Vĩnh Bảo','Vinh Bao','Huyện Vĩnh Bảo','Vinh Bao District','vinh_bao','31',7),
            ('317','Cát Hải','Cat Hai','Huyện Cát Hải','Cat Hai District','cat_hai','31',7),
            ('318','Bạch Long Vĩ','Bach Long Vi','Huyện Bạch Long Vĩ','Bach Long Vi District','bach_long_vi','31',7),
            ('323','Hưng Yên','Hung Yen','Thành phố Hưng Yên','Hung Yen City','hung_yen','33',4),
            ('325','Văn Lâm','Van Lam','Huyện Văn Lâm','Van Lam District','van_lam','33',7),
            ('326','Văn Giang','Van Giang','Huyện Văn Giang','Van Giang District','van_giang','33',7),
            ('327','Yên Mỹ','Yen My','Huyện Yên Mỹ','Yen My District','yen_my','33',7),
            ('328','Mỹ Hào','My Hao','Thị xã Mỹ Hào','My Hao Town','my_hao','33',6),
            ('329','Ân Thi','An Thi','Huyện Ân Thi','An Thi District','an_thi','33',7),
            ('330','Khoái Châu','Khoai Chau','Huyện Khoái Châu','Khoai Chau District','khoai_chau','33',7),
            ('331','Kim Động','Kim Dong','Huyện Kim Động','Kim Dong District','kim_dong','33',7),
            ('332','Tiên Lữ','Tien Lu','Huyện Tiên Lữ','Tien Lu District','tien_lu','33',7),
            ('333','Phù Cừ','Phu Cu','Huyện Phù Cừ','Phu Cu District','phu_cu','33',7),
            ('336','Thái Bình','Thai Binh','Thành phố Thái Bình','Thai Binh City','thai_binh','34',4),
            ('338','Quỳnh Phụ','Quynh Phu','Huyện Quỳnh Phụ','Quynh Phu District','quynh_phu','34',7),
            ('339','Hưng Hà','Hung Ha','Huyện Hưng Hà','Hung Ha District','hung_ha','34',7),
            ('340','Đông Hưng','Dong Hung','Huyện Đông Hưng','Dong Hung District','dong_hung','34',7),
            ('341','Thái Thụy','Thai Thuy','Huyện Thái Thụy','Thai Thuy District','thai_thuy','34',7),
            ('342','Tiền Hải','Tien Hai','Huyện Tiền Hải','Tien Hai District','tien_hai','34',7),
            ('343','Kiến Xương','Kien Xuong','Huyện Kiến Xương','Kien Xuong District','kien_xuong','34',7),
            ('344','Vũ Thư','Vu Thu','Huyện Vũ Thư','Vu Thu District','vu_thu','34',7),
            ('347','Phủ Lý','Phu Ly','Thành phố Phủ Lý','Phu Ly City','phu_ly','35',4),
            ('349','Duy Tiên','Duy Tien','Thị xã Duy Tiên','Duy Tien Town','duy_tien','35',6),
            ('350','Kim Bảng','Kim Bang','Thị xã Kim Bảng','Kim Bang Town','kim_bang','35',6),
            ('351','Thanh Liêm','Thanh Liem','Huyện Thanh Liêm','Thanh Liem District','thanh_liem','35',7),
            ('352','Bình Lục','Binh Luc','Huyện Bình Lục','Binh Luc District','binh_luc','35',7),
            ('353','Lý Nhân','Ly Nhan','Huyện Lý Nhân','Ly Nhan District','ly_nhan','35',7),
            ('356','Nam Định','Nam Dinh','Thành phố Nam Định','Nam Dinh City','nam_dinh','36',4),
            ('359','Vụ Bản','Vu Ban','Huyện Vụ Bản','Vu Ban District','vu_ban','36',7),
            ('360','Ý Yên','Y Yen','Huyện Ý Yên','Y Yen District','y_yen','36',7),
            ('361','Nghĩa Hưng','Nghia Hung','Huyện Nghĩa Hưng','Nghia Hung District','nghia_hung','36',7),
            ('362','Nam Trực','Nam Truc','Huyện Nam Trực','Nam Truc District','nam_truc','36',7),
            ('363','Trực Ninh','Truc Ninh','Huyện Trực Ninh','Truc Ninh District','truc_ninh','36',7),
            ('364','Xuân Trường','Xuan Truong','Huyện Xuân Trường','Xuan Truong District','xuan_truong','36',7),
            ('365','Giao Thủy','Giao Thuy','Huyện Giao Thủy','Giao Thuy District','giao_thuy','36',7),
            ('366','Hải Hậu','Hai Hau','Huyện Hải Hậu','Hai Hau District','hai_hau','36',7),
            ('370','Tam Điệp','Tam Diep','Thành phố Tam Điệp','Tam Diep City','tam_diep','37',4),
            ('372','Nho Quan','Nho Quan','Huyện Nho Quan','Nho Quan District','nho_quan','37',7),
            ('373','Gia Viễn','Gia Vien','Huyện Gia Viễn','Gia Vien District','gia_vien','37',7),
            ('374','Hoa Lư','Hoa Lu','Thành phố Hoa Lư','Hoa Lu City','hoa_lu','37',4),
            ('375','Yên Khánh','Yen Khanh','Huyện Yên Khánh','Yen Khanh District','yen_khanh','37',7),
            ('376','Kim Sơn','Kim Son','Huyện Kim Sơn','Kim Son District','kim_son','37',7),
            ('377','Yên Mô','Yen Mo','Huyện Yên Mô','Yen Mo District','yen_mo','37',7),
            ('380','Thanh Hóa','Thanh Hoa','Thành phố Thanh Hóa','Thanh Hoa City','thanh_hoa','38',4),
            ('381','Bỉm Sơn','Bim Son','Thị xã Bỉm Sơn','Bim Son Town','bim_son','38',6),
            ('382','Sầm Sơn','Sam Son','Thành phố Sầm Sơn','Sam Son City','sam_son','38',4),
            ('384','Mường Lát','Muong Lat','Huyện Mường Lát','Muong Lat District','muong_lat','38',7),
            ('385','Quan Hóa','Quan Hoa','Huyện Quan Hóa','Quan Hoa District','quan_hoa','38',7),
            ('386','Bá Thước','Ba Thuoc','Huyện Bá Thước','Ba Thuoc District','ba_thuoc','38',7),
            ('387','Quan Sơn','Quan Son','Huyện Quan Sơn','Quan Son District','quan_son','38',7),
            ('388','Lang Chánh','Lang Chanh','Huyện Lang Chánh','Lang Chanh District','lang_chanh','38',7),
            ('389','Ngọc Lặc','Ngoc Lac','Huyện Ngọc Lặc','Ngoc Lac District','ngoc_lac','38',7),
            ('390','Cẩm Thủy','Cam Thuy','Huyện Cẩm Thủy','Cam Thuy District','cam_thuy','38',7),
            ('391','Thạch Thành','Thach Thanh','Huyện Thạch Thành','Thach Thanh District','thach_thanh','38',7),
            ('392','Hà Trung','Ha Trung','Huyện Hà Trung','Ha Trung District','ha_trung','38',7),
            ('393','Vĩnh Lộc','Vinh Loc','Huyện Vĩnh Lộc','Vinh Loc District','vinh_loc','38',7),
            ('394','Yên Định','Yen Dinh','Huyện Yên Định','Yen Dinh District','yen_dinh','38',7),
            ('395','Thọ Xuân','Tho Xuan','Huyện Thọ Xuân','Tho Xuan District','tho_xuan','38',7),
            ('396','Thường Xuân','Thuong Xuan','Huyện Thường Xuân','Thuong Xuan District','thuong_xuan','38',7),
            ('397','Triệu Sơn','Trieu Son','Huyện Triệu Sơn','Trieu Son District','trieu_son','38',7),
            ('398','Thiệu Hóa','Thieu Hoa','Huyện Thiệu Hóa','Thieu Hoa District','thieu_hoa','38',7),
            ('399','Hoằng Hóa','Hoang Hoa','Huyện Hoằng Hóa','Hoang Hoa District','hoang_hoa','38',7),
            ('400','Hậu Lộc','Hau Loc','Huyện Hậu Lộc','Hau Loc District','hau_loc','38',7),
            ('401','Nga Sơn','Nga Son','Huyện Nga Sơn','Nga Son District','nga_son','38',7),
            ('402','Như Xuân','Nhu Xuan','Huyện Như Xuân','Nhu Xuan District','nhu_xuan','38',7),
            ('403','Như Thanh','Nhu Thanh','Huyện Như Thanh','Nhu Thanh District','nhu_thanh','38',7),
            ('404','Nông Cống','Nong Cong','Huyện Nông Cống','Nong Cong District','nong_cong','38',7),
            ('406','Quảng Xương','Quang Xuong','Huyện Quảng Xương','Quang Xuong District','quang_xuong','38',7),
            ('407','Nghi Sơn','Nghi Son','Thị xã Nghi Sơn','Nghi Son Town','nghi_son','38',6),
            ('412','Vinh','Vinh','Thành phố Vinh','Vinh City','vinh','40',4),
            ('414','Thái Hòa','Thai Hoa','Thị xã Thái Hòa','Thai Hoa Town','thai_hoa','40',6),
            ('415','Quế Phong','Que Phong','Huyện Quế Phong','Que Phong District','que_phong','40',7),
            ('416','Quỳ Châu','Quy Chau','Huyện Quỳ Châu','Quy Chau District','quy_chau','40',7),
            ('417','Kỳ Sơn','Ky Son','Huyện Kỳ Sơn','Ky Son District','ky_son','40',7),
            ('418','Tương Dương','Tuong Duong','Huyện Tương Dương','Tuong Duong District','tuong_duong','40',7),
            ('419','Nghĩa Đàn','Nghia Dan','Huyện Nghĩa Đàn','Nghia Dan District','nghia_dan','40',7),
            ('420','Quỳ Hợp','Quy Hop','Huyện Quỳ Hợp','Quy Hop District','quy_hop','40',7),
            ('421','Quỳnh Lưu','Quynh Luu','Huyện Quỳnh Lưu','Quynh Luu District','quynh_luu','40',7),
            ('422','Con Cuông','Con Cuong','Huyện Con Cuông','Con Cuong District','con_cuong','40',7)
        ON DUPLICATE KEY UPDATE
            Name                 = VALUES(Name),
            NameEn               = VALUES(NameEn),
            FullName             = VALUES(FullName),
            FullNameEn           = VALUES(FullNameEn),
            CodeName             = VALUES(CodeName),
            ProvinceCode         = VALUES(ProvinceCode),
            AdministrativeUnitID = VALUES(AdministrativeUnitID)
    `);

    await pool.execute(`
        INSERT INTO Districts(DistrictCode, Name, NameEn, FullName, FullNameEn, CodeName, ProvinceCode, AdministrativeUnitID) VALUES
            ('423','Tân Kỳ','Tan Ky','Huyện Tân Kỳ','Tan Ky District','tan_ky','40',7),
            ('424','Anh Sơn','Anh Son','Huyện Anh Sơn','Anh Son District','anh_son','40',7),
            ('425','Diễn Châu','Dien Chau','Huyện Diễn Châu','Dien Chau District','dien_chau','40',7),
            ('426','Yên Thành','Yen Thanh','Huyện Yên Thành','Yen Thanh District','yen_thanh','40',7),
            ('427','Đô Lương','Do Luong','Huyện Đô Lương','Do Luong District','do_luong','40',7),
            ('428','Thanh Chương','Thanh Chuong','Huyện Thanh Chương','Thanh Chuong District','thanh_chuong','40',7),
            ('429','Nghi Lộc','Nghi Loc','Huyện Nghi Lộc','Nghi Loc District','nghi_loc','40',7),
            ('430','Nam Đàn','Nam Dan','Huyện Nam Đàn','Nam Dan District','nam_dan','40',7),
            ('431','Hưng Nguyên','Hung Nguyen','Huyện Hưng Nguyên','Hung Nguyen District','hung_nguyen','40',7),
            ('432','Hoàng Mai','Hoang Mai','Thị xã Hoàng Mai','Hoang Mai Town','hoang_mai','40',6),
            ('436','Hà Tĩnh','Ha Tinh','Thành phố Hà Tĩnh','Ha Tinh City','ha_tinh','42',4),
            ('437','Hồng Lĩnh','Hong Linh','Thị xã Hồng Lĩnh','Hong Linh Town','hong_linh','42',6),
            ('439','Hương Sơn','Huong Son','Huyện Hương Sơn','Huong Son District','huong_son','42',7),
            ('440','Đức Thọ','Duc Tho','Huyện Đức Thọ','Duc Tho District','duc_tho','42',7),
            ('441','Vũ Quang','Vu Quang','Huyện Vũ Quang','Vu Quang District','vu_quang','42',7),
            ('442','Nghi Xuân','Nghi Xuan','Huyện Nghi Xuân','Nghi Xuan District','nghi_xuan','42',7),
            ('443','Can Lộc','Can Loc','Huyện Can Lộc','Can Loc District','can_loc','42',7),
            ('444','Hương Khê','Huong Khe','Huyện Hương Khê','Huong Khe District','huong_khe','42',7),
            ('445','Thạch Hà','Thach Ha','Huyện Thạch Hà','Thach Ha District','thach_ha','42',7),
            ('446','Cẩm Xuyên','Cam Xuyen','Huyện Cẩm Xuyên','Cam Xuyen District','cam_xuyen','42',7),
            ('447','Kỳ Anh','Ky Anh','Huyện Kỳ Anh','Ky Anh District','ky_anh','42',7),
            ('449','Kỳ Anh','Ky Anh','Thị xã Kỳ Anh','Ky Anh Town','ky_anh','42',6),
            ('450','Đồng Hới','Dong Hoi','Thành phố Đồng Hới','Dong Hoi City','dong_hoi','44',4),
            ('452','Minh Hóa','Minh Hoa','Huyện Minh Hóa','Minh Hoa District','minh_hoa','44',7),
            ('453','Tuyên Hóa','Tuyen Hoa','Huyện Tuyên Hóa','Tuyen Hoa District','tuyen_hoa','44',7),
            ('454','Quảng Trạch','Quang Trach','Huyện Quảng Trạch','Quang Trach District','quang_trach','44',7),
            ('455','Bố Trạch','Bo Trach','Huyện Bố Trạch','Bo Trach District','bo_trach','44',7),
            ('456','Quảng Ninh','Quang Ninh','Huyện Quảng Ninh','Quang Ninh District','quang_ninh','44',7),
            ('457','Lệ Thủy','Le Thuy','Huyện Lệ Thủy','Le Thuy District','le_thuy','44',7),
            ('458','Ba Đồn','Ba Don','Thị xã Ba Đồn','Ba Don Town','ba_don','44',6),
            ('461','Đông Hà','Dong Ha','Thành phố Đông Hà','Dong Ha City','dong_ha','45',4),
            ('462','Quảng Trị','Quang Tri','Thị xã Quảng Trị','Quang Tri Town','quang_tri','45',6),
            ('464','Vĩnh Linh','Vinh Linh','Huyện Vĩnh Linh','Vinh Linh District','vinh_linh','45',7),
            ('465','Hướng Hóa','Huong Hoa','Huyện Hướng Hóa','Huong Hoa District','huong_hoa','45',7),
            ('466','Gio Linh','Gio Linh','Huyện Gio Linh','Gio Linh District','gio_linh','45',7),
            ('467','Đa Krông','Da Krong','Huyện Đa Krông','Da Krong District','da_krong','45',7),
            ('468','Cam Lộ','Cam Lo','Huyện Cam Lộ','Cam Lo District','cam_lo','45',7),
            ('469','Triệu Phong','Trieu Phong','Huyện Triệu Phong','Trieu Phong District','trieu_phong','45',7),
            ('470','Hải Lăng','Hai Lang','Huyện Hải Lăng','Hai Lang District','hai_lang','45',7),
            ('471','Cồn Cỏ','Con Co','Huyện Cồn Cỏ','Con Co District','con_co','45',7),
            ('474','Thuận Hóa','Thuan Hoa','Quận Thuận Hóa','Thuan Hoa District','thuan_hoa','46',5),
            ('475','Phú Xuân','Phu Xuan','Quận Phú Xuân','Phu Xuan District','phu_xuan','46',5),
            ('476','Phong Điền','Phong Dien','Thị xã Phong Điền','Phong Dien Town','phong_dien','46',6),
            ('477','Quảng Điền','Quang Dien','Huyện Quảng Điền','Quang Dien District','quang_dien','46',7),
            ('478','Phú Vang','Phu Vang','Huyện Phú Vang','Phu Vang District','phu_vang','46',7),
            ('479','Hương Thủy','Huong Thuy','Thị xã Hương Thủy','Huong Thuy Town','huong_thuy','46',6),
            ('480','Hương Trà','Huong Tra','Thị xã Hương Trà','Huong Tra Town','huong_tra','46',6),
            ('481','A Lưới','A Luoi','Huyện A Lưới','A Luoi District','a_luoi','46',7),
            ('482','Phú Lộc','Phu Loc','Huyện Phú Lộc','Phu Loc District','phu_loc','46',7),
            ('490','Liên Chiểu','Lien Chieu','Quận Liên Chiểu','Lien Chieu District','lien_chieu','48',5)
        ON DUPLICATE KEY UPDATE
            Name                 = VALUES(Name),
            NameEn               = VALUES(NameEn),
            FullName             = VALUES(FullName),
            FullNameEn           = VALUES(FullNameEn),
            CodeName             = VALUES(CodeName),
            ProvinceCode         = VALUES(ProvinceCode),
            AdministrativeUnitID = VALUES(AdministrativeUnitID)
    `);

    await pool.execute(`
        INSERT INTO Districts(DistrictCode, Name, NameEn, FullName, FullNameEn, CodeName, ProvinceCode, AdministrativeUnitID) VALUES
            ('491','Thanh Khê','Thanh Khe','Quận Thanh Khê','Thanh Khe District','thanh_khe','48',5),
            ('492','Hải Châu','Hai Chau','Quận Hải Châu','Hai Chau District','hai_chau','48',5),
            ('493','Sơn Trà','Son Tra','Quận Sơn Trà','Son Tra District','son_tra','48',5),
            ('494','Ngũ Hành Sơn','Ngu Hanh Son','Quận Ngũ Hành Sơn','Ngu Hanh Son District','ngu_hanh_son','48',5),
            ('495','Cẩm Lệ','Cam Le','Quận Cẩm Lệ','Cam Le District','cam_le','48',5),
            ('497','Hòa Vang','Hoa Vang','Huyện Hòa Vang','Hoa Vang District','hoa_vang','48',7),
            ('498','Hoàng Sa','Hoang Sa','Huyện Hoàng Sa','Hoang Sa District','hoang_sa','48',7),
            ('502','Tam Kỳ','Tam Ky','Thành phố Tam Kỳ','Tam Ky City','tam_ky','49',4),
            ('503','Hội An','Hoi An','Thành phố Hội An','Hoi An City','hoi_an','49',4),
            ('504','Tây Giang','Tay Giang','Huyện Tây Giang','Tay Giang District','tay_giang','49',7),
            ('505','Đông Giang','Dong Giang','Huyện Đông Giang','Dong Giang District','dong_giang','49',7),
            ('506','Đại Lộc','Dai Loc','Huyện Đại Lộc','Dai Loc District','dai_loc','49',7),
            ('507','Điện Bàn','Dien Ban','Thị xã Điện Bàn','Dien Ban Town','dien_ban','49',6),
            ('508','Duy Xuyên','Duy Xuyen','Huyện Duy Xuyên','Duy Xuyen District','duy_xuyen','49',7),
            ('509','Quế Sơn','Que Son','Huyện Quế Sơn','Que Son District','que_son','49',7),
            ('510','Nam Giang','Nam Giang','Huyện Nam Giang','Nam Giang District','nam_giang','49',7),
            ('511','Phước Sơn','Phuoc Son','Huyện Phước Sơn','Phuoc Son District','phuoc_son','49',7),
            ('512','Hiệp Đức','Hiep Duc','Huyện Hiệp Đức','Hiep Duc District','hiep_duc','49',7),
            ('513','Thăng Bình','Thang Binh','Huyện Thăng Bình','Thang Binh District','thang_binh','49',7),
            ('514','Tiên Phước','Tien Phuoc','Huyện Tiên Phước','Tien Phuoc District','tien_phuoc','49',7),
            ('515','Bắc Trà My','Bac Tra My','Huyện Bắc Trà My','Bac Tra My District','bac_tra_my','49',7),
            ('516','Nam Trà My','Nam Tra My','Huyện Nam Trà My','Nam Tra My District','nam_tra_my','49',7),
            ('517','Núi Thành','Nui Thanh','Huyện Núi Thành','Nui Thanh District','nui_thanh','49',7),
            ('518','Phú Ninh','Phu Ninh','Huyện Phú Ninh','Phu Ninh District','phu_ninh','49',7),
            ('522','Quảng Ngãi','Quang Ngai','Thành phố Quảng Ngãi','Quang Ngai City','quang_ngai','51',4),
            ('524','Bình Sơn','Binh Son','Huyện Bình Sơn','Binh Son District','binh_son','51',7),
            ('525','Trà Bồng','Tra Bong','Huyện Trà Bồng','Tra Bong District','tra_bong','51',7),
            ('527','Sơn Tịnh','Son Tinh','Huyện Sơn Tịnh','Son Tinh District','son_tinh','51',7),
            ('528','Tư Nghĩa','Tu Nghia','Huyện Tư Nghĩa','Tu Nghia District','tu_nghia','51',7),
            ('529','Sơn Hà','Son Ha','Huyện Sơn Hà','Son Ha District','son_ha','51',7),
            ('530','Sơn Tây','Son Tay','Huyện Sơn Tây','Son Tay District','son_tay','51',7),
            ('531','Minh Long','Minh Long','Huyện Minh Long','Minh Long District','minh_long','51',7),
            ('532','Nghĩa Hành','Nghia Hanh','Huyện Nghĩa Hành','Nghia Hanh District','nghia_hanh','51',7),
            ('533','Mộ Đức','Mo Duc','Huyện Mộ Đức','Mo Duc District','mo_duc','51',7),
            ('534','Đức Phổ','Duc Pho','Thị xã Đức Phổ','Duc Pho Town','duc_pho','51',6),
            ('535','Ba Tơ','Ba To','Huyện Ba Tơ','Ba To District','ba_to','51',7),
            ('536','Lý Sơn','Ly Son','Huyện Lý Sơn','Ly Son District','ly_son','51',7),
            ('540','Quy Nhơn','Quy Nhon','Thành phố Quy Nhơn','Quy Nhon City','quy_nhon','52',4),
            ('542','An Lão','An Lao','Huyện An Lão','An Lao District','an_lao','52',7),
            ('543','Hoài Nhơn','Hoai Nhon','Thị xã Hoài Nhơn','Hoai Nhon Town','hoai_nhon','52',6),
            ('544','Hoài Ân','Hoai An','Huyện Hoài Ân','Hoai An District','hoai_an','52',7),
            ('545','Phù Mỹ','Phu My','Huyện Phù Mỹ','Phu My District','phu_my','52',7),
            ('546','Vĩnh Thạnh','Vinh Thanh','Huyện Vĩnh Thạnh','Vinh Thanh District','vinh_thanh','52',7),
            ('547','Tây Sơn','Tay Son','Huyện Tây Sơn','Tay Son District','tay_son','52',7),
            ('548','Phù Cát','Phu Cat','Huyện Phù Cát','Phu Cat District','phu_cat','52',7),
            ('549','An Nhơn','An Nhon','Thị xã An Nhơn','An Nhon Town','an_nhon','52',6),
            ('550','Tuy Phước','Tuy Phuoc','Huyện Tuy Phước','Tuy Phuoc District','tuy_phuoc','52',7),
            ('551','Vân Canh','Van Canh','Huyện Vân Canh','Van Canh District','van_canh','52',7),
            ('555','Tuy Hòa','Tuy Hoa','Thành phố Tuy Hòa','Tuy Hoa City','tuy_hoa','54',4),
            ('557','Sông Cầu','Song Cau','Thị xã Sông Cầu','Song Cau Town','song_cau','54',6),
            ('558','Đồng Xuân','Dong Xuan','Huyện Đồng Xuân','Dong Xuan District','dong_xuan','54',7),
            ('559','Tuy An','Tuy An','Huyện Tuy An','Tuy An District','tuy_an','54',7),
            ('560','Sơn Hòa','Son Hoa','Huyện Sơn Hòa','Son Hoa District','son_hoa','54',7),
            ('561','Sông Hinh','Song Hinh','Huyện Sông Hinh','Song Hinh District','song_hinh','54',7),
            ('562','Tây Hòa','Tay Hoa','Huyện Tây Hòa','Tay Hoa District','tay_hoa','54',7),
            ('563','Phú Hòa','Phu Hoa','Huyện Phú Hòa','Phu Hoa District','phu_hoa','54',7),
            ('564','Đông Hòa','Dong Hoa','Thị xã Đông Hòa','Dong Hoa Town','dong_hoa','54',6),
            ('568','Nha Trang','Nha Trang','Thành phố Nha Trang','Nha Trang City','nha_trang','56',4),
            ('569','Cam Ranh','Cam Ranh','Thành phố Cam Ranh','Cam Ranh City','cam_ranh','56',4),
            ('570','Cam Lâm','Cam Lam','Huyện Cam Lâm','Cam Lam District','cam_lam','56',7),
            ('571','Vạn Ninh','Van Ninh','Huyện Vạn Ninh','Van Ninh District','van_ninh','56',7),
            ('572','Ninh Hòa','Ninh Hoa','Thị xã Ninh Hòa','Ninh Hoa Town','ninh_hoa','56',6),
            ('573','Khánh Vĩnh','Khanh Vinh','Huyện Khánh Vĩnh','Khanh Vinh District','khanh_vinh','56',7),
            ('574','Diên Khánh','Dien Khanh','Huyện Diên Khánh','Dien Khanh District','dien_khanh','56',7),
            ('575','Khánh Sơn','Khanh Son','Huyện Khánh Sơn','Khanh Son District','khanh_son','56',7),
            ('576','Trường Sa','Truong Sa','Huyện Trường Sa','Truong Sa District','truong_sa','56',7),
            ('582','Phan Rang-Tháp Chàm','Phan Rang-Thap Cham','Thành phố Phan Rang-Tháp Chàm','Phan Rang-Thap Cham City','phan_rang-thap_cham','58',4),
            ('584','Bác Ái','Bac Ai','Huyện Bác Ái','Bac Ai District','bac_ai','58',7),
            ('585','Ninh Sơn','Ninh Son','Huyện Ninh Sơn','Ninh Son District','ninh_son','58',7),
            ('586','Ninh Hải','Ninh Hai','Huyện Ninh Hải','Ninh Hai District','ninh_hai','58',7),
            ('587','Ninh Phước','Ninh Phuoc','Huyện Ninh Phước','Ninh Phuoc District','ninh_phuoc','58',7),
            ('588','Thuận Bắc','Thuan Bac','Huyện Thuận Bắc','Thuan Bac District','thuan_bac','58',7),
            ('589','Thuận Nam','Thuan Nam','Huyện Thuận Nam','Thuan Nam District','thuan_nam','58',7),
            ('593','Phan Thiết','Phan Thiet','Thành phố Phan Thiết','Phan Thiet City','phan_thiet','60',4),
            ('594','La Gi','La Gi','Thị xã La Gi','La Gi Town','la_gi','60',6),
            ('595','Tuy Phong','Tuy Phong','Huyện Tuy Phong','Tuy Phong District','tuy_phong','60',7),
            ('596','Bắc Bình','Bac Binh','Huyện Bắc Bình','Bac Binh District','bac_binh','60',7),
            ('597','Hàm Thuận Bắc','Ham Thuan Bac','Huyện Hàm Thuận Bắc','Ham Thuan Bac District','ham_thuan_bac','60',7),
            ('598','Hàm Thuận Nam','Ham Thuan Nam','Huyện Hàm Thuận Nam','Ham Thuan Nam District','ham_thuan_nam','60',7),
            ('599','Tánh Linh','Tanh Linh','Huyện Tánh Linh','Tanh Linh District','tanh_linh','60',7),
            ('600','Đức Linh','Duc Linh','Huyện Đức Linh','Duc Linh District','duc_linh','60',7),
            ('601','Hàm Tân','Ham Tan','Huyện Hàm Tân','Ham Tan District','ham_tan','60',7),
            ('602','Phú Quí','Phu Qui','Huyện Phú Quí','Phu Qui District','phu_qui','60',7),
            ('608','Kon Tum','Kon Tum','Thành phố Kon Tum','Kon Tum City','kon_tum','62',4),
            ('610','Đắk Glei','Dak Glei','Huyện Đắk Glei','Dak Glei District','dak_glei','62',7),
            ('611','Ngọc Hồi','Ngoc Hoi','Huyện Ngọc Hồi','Ngoc Hoi District','ngoc_hoi','62',7),
            ('612','Đắk Tô','Dak To','Huyện Đắk Tô','Dak To District','dak_to','62',7),
            ('613','Kon Plông','Kon Plong','Huyện Kon Plông','Kon Plong District','kon_plong','62',7),
            ('614','Kon Rẫy','Kon Ray','Huyện Kon Rẫy','Kon Ray District','kon_ray','62',7),
            ('615','Đắk Hà','Dak Ha','Huyện Đắk Hà','Dak Ha District','dak_ha','62',7),
            ('616','Sa Thầy','Sa Thay','Huyện Sa Thầy','Sa Thay District','sa_thay','62',7),
            ('617','Tu Mơ Rông','Tu Mo Rong','Huyện Tu Mơ Rông','Tu Mo Rong District','tu_mo_rong','62',7),
            ('618','Ia H'' Drai','Ia H'' Drai','Huyện Ia H'' Drai','Ia H'' Drai District','ia_h_drai','62',7),
            ('622','Pleiku','Pleiku','Thành phố Pleiku','Pleiku City','pleiku','64',4),
            ('623','An Khê','An Khe','Thị xã An Khê','An Khe Town','an_khe','64',6),
            ('624','Ayun Pa','Ayun Pa','Thị xã Ayun Pa','Ayun Pa Town','ayun_pa','64',6),
            ('625','KBang','KBang','Huyện KBang','KBang District','kbang','64',7),
            ('626','Đăk Đoa','Dak Doa','Huyện Đăk Đoa','Dak Doa District','dak_doa','64',7),
            ('627','Chư Păh','Chu Pah','Huyện Chư Păh','Chu Pah District','chu_pah','64',7),
            ('628','Ia Grai','Ia Grai','Huyện Ia Grai','Ia Grai District','ia_grai','64',7)
        ON DUPLICATE KEY UPDATE
            Name                 = VALUES(Name),
            NameEn               = VALUES(NameEn),
            FullName             = VALUES(FullName),
            FullNameEn           = VALUES(FullNameEn),
            CodeName             = VALUES(CodeName),
            ProvinceCode         = VALUES(ProvinceCode),
            AdministrativeUnitID = VALUES(AdministrativeUnitID)
    `);

    await pool.execute(`
        INSERT INTO Districts(DistrictCode, Name, NameEn, FullName, FullNameEn, CodeName, ProvinceCode, AdministrativeUnitID) VALUES
            ('629','Mang Yang','Mang Yang','Huyện Mang Yang','Mang Yang District','mang_yang','64',7),
            ('630','Kông Chro','Kong Chro','Huyện Kông Chro','Kong Chro District','kong_chro','64',7),
            ('631','Đức Cơ','Duc Co','Huyện Đức Cơ','Duc Co District','duc_co','64',7),
            ('632','Chư Prông','Chu Prong','Huyện Chư Prông','Chu Prong District','chu_prong','64',7),
            ('633','Chư Sê','Chu Se','Huyện Chư Sê','Chu Se District','chu_se','64',7),
            ('634','Đăk Pơ','Dak Po','Huyện Đăk Pơ','Dak Po District','dak_po','64',7),
            ('635','Ia Pa','Ia Pa','Huyện Ia Pa','Ia Pa District','ia_pa','64',7),
            ('637','Krông Pa','Krong Pa','Huyện Krông Pa','Krong Pa District','krong_pa','64',7),
            ('638','Phú Thiện','Phu Thien','Huyện Phú Thiện','Phu Thien District','phu_thien','64',7),
            ('639','Chư Pưh','Chu Puh','Huyện Chư Pưh','Chu Puh District','chu_puh','64',7),
            ('643','Buôn Ma Thuột','Buon Ma Thuot','Thành phố Buôn Ma Thuột','Buon Ma Thuot City','buon_ma_thuot','66',4),
            ('644','Buôn Hồ','Buon Ho','Thị xã Buôn Hồ','Buon Ho Town','buon_ho','66',6),
            ('645','Ea H''leo','Ea H''leo','Huyện Ea H''leo','Ea H''leo District','ea_hleo','66',7),
            ('646','Ea Súp','Ea Sup','Huyện Ea Súp','Ea Sup District','ea_sup','66',7),
            ('647','Buôn Đôn','Buon Don','Huyện Buôn Đôn','Buon Don District','buon_don','66',7),
            ('648','Cư M''gar','Cu M''gar','Huyện Cư M''gar','Cu M''gar District','cu_mgar','66',7),
            ('649','Krông Búk','Krong Buk','Huyện Krông Búk','Krong Buk District','krong_buk','66',7),
            ('650','Krông Năng','Krong Nang','Huyện Krông Năng','Krong Nang District','krong_nang','66',7),
            ('651','Ea Kar','Ea Kar','Huyện Ea Kar','Ea Kar District','ea_kar','66',7),
            ('652','M''Đrắk','M''Drak','Huyện M''Đrắk','M''Drak District','mdrak','66',7),
            ('653','Krông Bông','Krong Bong','Huyện Krông Bông','Krong Bong District','krong_bong','66',7),
            ('654','Krông Pắc','Krong Pac','Huyện Krông Pắc','Krong Pac District','krong_pac','66',7),
            ('655','Krông A Na','Krong A Na','Huyện Krông A Na','Krong A Na District','krong_a_na','66',7),
            ('656','Lắk','Lak','Huyện Lắk','Lak District','lak','66',7),
            ('657','Cư Kuin','Cu Kuin','Huyện Cư Kuin','Cu Kuin District','cu_kuin','66',7),
            ('660','Gia Nghĩa','Gia Nghia','Thành phố Gia Nghĩa','Gia Nghia City','gia_nghia','67',4),
            ('661','Đăk Glong','Dak Glong','Huyện Đăk Glong','Dak Glong District','dak_glong','67',7),
            ('662','Cư Jút','Cu Jut','Huyện Cư Jút','Cu Jut District','cu_jut','67',7),
            ('663','Đắk Mil','Dak Mil','Huyện Đắk Mil','Dak Mil District','dak_mil','67',7),
            ('664','Krông Nô','Krong No','Huyện Krông Nô','Krong No District','krong_no','67',7),
            ('665','Đắk Song','Dak Song','Huyện Đắk Song','Dak Song District','dak_song','67',7),
            ('666','Đắk R''Lấp','Dak R''Lap','Huyện Đắk R''Lấp','Dak R''Lap District','dak_rlap','67',7),
            ('667','Tuy Đức','Tuy Duc','Huyện Tuy Đức','Tuy Duc District','tuy_duc','67',7),
            ('672','Đà Lạt','Da Lat','Thành phố Đà Lạt','Da Lat City','da_lat','68',4),
            ('673','Bảo Lộc','Bao Loc','Thành phố Bảo Lộc','Bao Loc City','bao_loc','68',4),
            ('674','Đam Rông','Dam Rong','Huyện Đam Rông','Dam Rong District','dam_rong','68',7),
            ('675','Lạc Dương','Lac Duong','Huyện Lạc Dương','Lac Duong District','lac_duong','68',7),
            ('676','Lâm Hà','Lam Ha','Huyện Lâm Hà','Lam Ha District','lam_ha','68',7),
            ('677','Đơn Dương','Don Duong','Huyện Đơn Dương','Don Duong District','don_duong','68',7),
            ('678','Đức Trọng','Duc Trong','Huyện Đức Trọng','Duc Trong District','duc_trong','68',7),
            ('679','Di Linh','Di Linh','Huyện Di Linh','Di Linh District','di_linh','68',7),
            ('680','Bảo Lâm','Bao Lam','Huyện Bảo Lâm','Bao Lam District','bao_lam','68',7),
            ('682','Đạ Tẻh','Da Teh','Huyện Đạ Tẻh','Da Teh District','da_teh','68',7),
            ('688','Phước Long','Phuoc Long','Thị xã Phước Long','Phuoc Long Town','phuoc_long','70',6),
            ('689','Đồng Xoài','Dong Xoai','Thành phố Đồng Xoài','Dong Xoai City','dong_xoai','70',4),
            ('690','Bình Long','Binh Long','Thị xã Bình Long','Binh Long Town','binh_long','70',6),
            ('691','Bù Gia Mập','Bu Gia Map','Huyện Bù Gia Mập','Bu Gia Map District','bu_gia_map','70',7),
            ('692','Lộc Ninh','Loc Ninh','Huyện Lộc Ninh','Loc Ninh District','loc_ninh','70',7),
            ('693','Bù Đốp','Bu Dop','Huyện Bù Đốp','Bu Dop District','bu_dop','70',7),
            ('694','Hớn Quản','Hon Quan','Huyện Hớn Quản','Hon Quan District','hon_quan','70',7),
            ('695','Đồng Phú','Dong Phu','Huyện Đồng Phú','Dong Phu District','dong_phu','70',7),
            ('696','Bù Đăng','Bu Dang','Huyện Bù Đăng','Bu Dang District','bu_dang','70',7),
            ('697','Chơn Thành','Chon Thanh','Thị xã Chơn Thành','Chon Thanh Town','chon_thanh','70',6),
            ('698','Phú Riềng','Phu Rieng','Huyện Phú Riềng','Phu Rieng District','phu_rieng','70',7),
            ('703','Tây Ninh','Tay Ninh','Thành phố Tây Ninh','Tay Ninh City','tay_ninh','72',4),
            ('705','Tân Biên','Tan Bien','Huyện Tân Biên','Tan Bien District','tan_bien','72',7),
            ('706','Tân Châu','Tan Chau','Huyện Tân Châu','Tan Chau District','tan_chau','72',7),
            ('707','Dương Minh Châu','Duong Minh Chau','Huyện Dương Minh Châu','Duong Minh Chau District','duong_minh_chau','72',7),
            ('708','Châu Thành','Chau Thanh','Huyện Châu Thành','Chau Thanh District','chau_thanh','72',7),
            ('709','Hòa Thành','Hoa Thanh','Thị xã Hòa Thành','Hoa Thanh Town','hoa_thanh','72',6),
            ('710','Gò Dầu','Go Dau','Huyện Gò Dầu','Go Dau District','go_dau','72',7),
            ('711','Bến Cầu','Ben Cau','Huyện Bến Cầu','Ben Cau District','ben_cau','72',7),
            ('712','Trảng Bàng','Trang Bang','Thị xã Trảng Bàng','Trang Bang Town','trang_bang','72',6),
            ('718','Thủ Dầu Một','Thu Dau Mot','Thành phố Thủ Dầu Một','Thu Dau Mot City','thu_dau_mot','74',4),
            ('719','Bàu Bàng','Bau Bang','Huyện Bàu Bàng','Bau Bang District','bau_bang','74',7),
            ('720','Dầu Tiếng','Dau Tieng','Huyện Dầu Tiếng','Dau Tieng District','dau_tieng','74',7),
            ('721','Bến Cát','Ben Cat','Thành phố Bến Cát','Ben Cat City','ben_cat','74',4),
            ('722','Phú Giáo','Phu Giao','Huyện Phú Giáo','Phu Giao District','phu_giao','74',7),
            ('723','Tân Uyên','Tan Uyen','Thành phố Tân Uyên','Tan Uyen City','tan_uyen','74',4),
            ('724','Dĩ An','Di An','Thành phố Dĩ An','Di An City','di_an','74',4),
            ('725','Thuận An','Thuan An','Thành phố Thuận An','Thuan An City','thuan_an','74',4),
            ('726','Bắc Tân Uyên','Bac Tan Uyen','Huyện Bắc Tân Uyên','Bac Tan Uyen District','bac_tan_uyen','74',7),
            ('731','Biên Hòa','Bien Hoa','Thành phố Biên Hòa','Bien Hoa City','bien_hoa','75',4),
            ('732','Long Khánh','Long Khanh','Thành phố Long Khánh','Long Khanh City','long_khanh','75',4),
            ('734','Tân Phú','Tan Phu','Huyện Tân Phú','Tan Phu District','tan_phu','75',7),
            ('735','Vĩnh Cửu','Vinh Cuu','Huyện Vĩnh Cửu','Vinh Cuu District','vinh_cuu','75',7),
            ('736','Định Quán','Dinh Quan','Huyện Định Quán','Dinh Quan District','dinh_quan','75',7),
            ('737','Trảng Bom','Trang Bom','Huyện Trảng Bom','Trang Bom District','trang_bom','75',7),
            ('738','Thống Nhất','Thong Nhat','Huyện Thống Nhất','Thong Nhat District','thong_nhat','75',7),
            ('739','Cẩm Mỹ','Cam My','Huyện Cẩm Mỹ','Cam My District','cam_my','75',7),
            ('740','Long Thành','Long Thanh','Huyện Long Thành','Long Thanh District','long_thanh','75',7),
            ('741','Xuân Lộc','Xuan Loc','Huyện Xuân Lộc','Xuan Loc District','xuan_loc','75',7),
            ('742','Nhơn Trạch','Nhon Trach','Huyện Nhơn Trạch','Nhon Trach District','nhon_trach','75',7),
            ('747','Vũng Tàu','Vung Tau','Thành phố Vũng Tàu','Vung Tau City','vung_tau','77',4),
            ('748','Bà Rịa','Ba Ria','Thành phố Bà Rịa','Ba Ria City','ba_ria','77',4),
            ('750','Châu Đức','Chau Duc','Huyện Châu Đức','Chau Duc District','chau_duc','77',7),
            ('751','Xuyên Mộc','Xuyen Moc','Huyện Xuyên Mộc','Xuyen Moc District','xuyen_moc','77',7),
            ('753','Long Đất','Long Dat','Huyện Long Đất','Long Dat District','long_dat','77',7),
            ('754','Phú Mỹ','Phu My','Thành phố Phú Mỹ','Phu My City','phu_my','77',4),
            ('755','Côn Đảo','Con Dao','Huyện Côn Đảo','Con Dao District','con_dao','77',7),
            ('760','1','1','Quận 1','District 1','1','79',5),
            ('761','12','12','Quận 12','District 12','12','79',5),
            ('764','Gò Vấp','Go Vap','Quận Gò Vấp','Go Vap District','go_vap','79',5),
            ('765','Bình Thạnh','Binh Thanh','Quận Bình Thạnh','Binh Thanh District','binh_thanh','79',5),
            ('766','Tân Bình','Tan Binh','Quận Tân Bình','Tan Binh District','tan_binh','79',5),
            ('767','Tân Phú','Tan Phu','Quận Tân Phú','Tan Phu District','tan_phu','79',5),
            ('768','Phú Nhuận','Phu Nhuan','Quận Phú Nhuận','Phu Nhuan District','phu_nhuan','79',5),
            ('769','Thủ Đức','Thu Duc','Thành phố Thủ Đức','Thu Duc City','thu_duc','79',3),
            ('770','3','3','Quận 3','District 3','3','79',5),
            ('771','10','10','Quận 10','District 10','10','79',5),
            ('772','11','11','Quận 11','District 11','11','79',5),
            ('773','4','4','Quận 4','District 4','4','79',5),
            ('774','5','5','Quận 5','District 5','5','79',5),
            ('775','6','6','Quận 6','District 6','6','79',5),
            ('776','8','8','Quận 8','District 8','8','79',5),
            ('777','Bình Tân','Binh Tan','Quận Bình Tân','Binh Tan District','binh_tan','79',5),
            ('778','7','7','Quận 7','District 7','7','79',5),
            ('783','Củ Chi','Cu Chi','Huyện Củ Chi','Cu Chi District','cu_chi','79',7),
            ('784','Hóc Môn','Hoc Mon','Huyện Hóc Môn','Hoc Mon District','hoc_mon','79',7),
            ('785','Bình Chánh','Binh Chanh','Huyện Bình Chánh','Binh Chanh District','binh_chanh','79',7),
            ('786','Nhà Bè','Nha Be','Huyện Nhà Bè','Nha Be District','nha_be','79',7),
            ('787','Cần Giờ','Can Gio','Huyện Cần Giờ','Can Gio District','can_gio','79',7),
            ('794','Tân An','Tan An','Thành phố Tân An','Tan An City','tan_an','80',4),
            ('795','Kiến Tường','Kien Tuong','Thị xã Kiến Tường','Kien Tuong Town','kien_tuong','80',6),
            ('796','Tân Hưng','Tan Hung','Huyện Tân Hưng','Tan Hung District','tan_hung','80',7),
            ('797','Vĩnh Hưng','Vinh Hung','Huyện Vĩnh Hưng','Vinh Hung District','vinh_hung','80',7),
            ('798','Mộc Hóa','Moc Hoa','Huyện Mộc Hóa','Moc Hoa District','moc_hoa','80',7),
            ('799','Tân Thạnh','Tan Thanh','Huyện Tân Thạnh','Tan Thanh District','tan_thanh','80',7),
            ('800','Thạnh Hóa','Thanh Hoa','Huyện Thạnh Hóa','Thanh Hoa District','thanh_hoa','80',7),
            ('801','Đức Huệ','Duc Hue','Huyện Đức Huệ','Duc Hue District','duc_hue','80',7),
            ('802','Đức Hòa','Duc Hoa','Huyện Đức Hòa','Duc Hoa District','duc_hoa','80',7),
            ('803','Bến Lức','Ben Luc','Huyện Bến Lức','Ben Luc District','ben_luc','80',7),
            ('804','Thủ Thừa','Thu Thua','Huyện Thủ Thừa','Thu Thua District','thu_thua','80',7),
            ('805','Tân Trụ','Tan Tru','Huyện Tân Trụ','Tan Tru District','tan_tru','80',7),
            ('806','Cần Đước','Can Duoc','Huyện Cần Đước','Can Duoc District','can_duoc','80',7),
            ('807','Cần Giuộc','Can Giuoc','Huyện Cần Giuộc','Can Giuoc District','can_giuoc','80',7),
            ('808','Châu Thành','Chau Thanh','Huyện Châu Thành','Chau Thanh District','chau_thanh','80',7),
            ('815','Mỹ Tho','My Tho','Thành phố Mỹ Tho','My Tho City','my_tho','82',4),
            ('816','Gò Công','Go Cong','Thành phố Gò Công','Go Cong City','go_cong','82',4),
            ('817','Cai Lậy','Cai Lay','Thị xã Cai Lậy','Cai Lay Town','cai_lay','82',6),
            ('818','Tân Phước','Tan Phuoc','Huyện Tân Phước','Tan Phuoc District','tan_phuoc','82',7),
            ('819','Cái Bè','Cai Be','Huyện Cái Bè','Cai Be District','cai_be','82',7),
            ('820','Cai Lậy','Cai Lay','Huyện Cai Lậy','Cai Lay District','cai_lay','82',7),
            ('821','Châu Thành','Chau Thanh','Huyện Châu Thành','Chau Thanh District','chau_thanh','82',7),
            ('822','Chợ Gạo','Cho Gao','Huyện Chợ Gạo','Cho Gao District','cho_gao','82',7),
            ('823','Gò Công Tây','Go Cong Tay','Huyện Gò Công Tây','Go Cong Tay District','go_cong_tay','82',7),
            ('824','Gò Công Đông','Go Cong Dong','Huyện Gò Công Đông','Go Cong Dong District','go_cong_dong','82',7),
            ('825','Tân Phú Đông','Tan Phu Dong','Huyện Tân Phú Đông','Tan Phu Dong District','tan_phu_dong','82',7),
            ('829','Bến Tre','Ben Tre','Thành phố Bến Tre','Ben Tre City','ben_tre','83',4),
            ('831','Châu Thành','Chau Thanh','Huyện Châu Thành','Chau Thanh District','chau_thanh','83',7),
            ('832','Chợ Lách','Cho Lach','Huyện Chợ Lách','Cho Lach District','cho_lach','83',7),
            ('833','Mỏ Cày Nam','Mo Cay Nam','Huyện Mỏ Cày Nam','Mo Cay Nam District','mo_cay_nam','83',7),
            ('834','Giồng Trôm','Giong Trom','Huyện Giồng Trôm','Giong Trom District','giong_trom','83',7),
            ('835','Bình Đại','Binh Dai','Huyện Bình Đại','Binh Dai District','binh_dai','83',7),
            ('836','Ba Tri','Ba Tri','Huyện Ba Tri','Ba Tri District','ba_tri','83',7),
            ('837','Thạnh Phú','Thanh Phu','Huyện Thạnh Phú','Thanh Phu District','thanh_phu','83',7),
            ('838','Mỏ Cày Bắc','Mo Cay Bac','Huyện Mỏ Cày Bắc','Mo Cay Bac District','mo_cay_bac','83',7),
            ('842','Trà Vinh','Tra Vinh','Thành phố Trà Vinh','Tra Vinh City','tra_vinh','84',4),
            ('844','Càng Long','Cang Long','Huyện Càng Long','Cang Long District','cang_long','84',7),
            ('845','Cầu Kè','Cau Ke','Huyện Cầu Kè','Cau Ke District','cau_ke','84',7)
        ON DUPLICATE KEY UPDATE
            Name                 = VALUES(Name),
            NameEn               = VALUES(NameEn),
            FullName             = VALUES(FullName),
            FullNameEn           = VALUES(FullNameEn),
            CodeName             = VALUES(CodeName),
            ProvinceCode         = VALUES(ProvinceCode),
            AdministrativeUnitID = VALUES(AdministrativeUnitID)
    `);

    await pool.execute(`
        INSERT INTO Districts(DistrictCode, Name, NameEn, FullName, FullNameEn, CodeName, ProvinceCode, AdministrativeUnitID) VALUES
            ('846','Tiểu Cần','Tieu Can','Huyện Tiểu Cần','Tieu Can District','tieu_can','84',7),
            ('847','Châu Thành','Chau Thanh','Huyện Châu Thành','Chau Thanh District','chau_thanh','84',7),
            ('848','Cầu Ngang','Cau Ngang','Huyện Cầu Ngang','Cau Ngang District','cau_ngang','84',7),
            ('849','Trà Cú','Tra Cu','Huyện Trà Cú','Tra Cu District','tra_cu','84',7),
            ('850','Duyên Hải','Duyen Hai','Huyện Duyên Hải','Duyen Hai District','duyen_hai','84',7),
            ('851','Duyên Hải','Duyen Hai','Thị xã Duyên Hải','Duyen Hai Town','duyen_hai','84',6),
            ('855','Vĩnh Long','Vinh Long','Thành phố Vĩnh Long','Vinh Long City','vinh_long','86',4),
            ('857','Long Hồ','Long Ho','Huyện Long Hồ','Long Ho District','long_ho','86',7),
            ('858','Mang Thít','Mang Thit','Huyện Mang Thít','Mang Thit District','mang_thit','86',7),
            ('859','Vũng Liêm','Vung Liem','Huyện Vũng Liêm','Vung Liem District','vung_liem','86',7),
            ('860','Tam Bình','Tam Binh','Huyện Tam Bình','Tam Binh District','tam_binh','86',7),
            ('861','Bình Minh','Binh Minh','Thị xã Bình Minh','Binh Minh Town','binh_minh','86',6),
            ('862','Trà Ôn','Tra On','Huyện Trà Ôn','Tra On District','tra_on','86',7),
            ('863','Bình Tân','Binh Tan','Huyện Bình Tân','Binh Tan District','binh_tan','86',7),
            ('866','Cao Lãnh','Cao Lanh','Thành phố Cao Lãnh','Cao Lanh City','cao_lanh','87',4),
            ('867','Sa Đéc','Sa Dec','Thành phố Sa Đéc','Sa Dec City','sa_dec','87',4),
            ('868','Hồng Ngự','Hong Ngu','Thành phố Hồng Ngự','Hong Ngu City','hong_ngu','87',4),
            ('869','Tân Hồng','Tan Hong','Huyện Tân Hồng','Tan Hong District','tan_hong','87',7),
            ('870','Hồng Ngự','Hong Ngu','Huyện Hồng Ngự','Hong Ngu District','hong_ngu','87',7),
            ('871','Tam Nông','Tam Nong','Huyện Tam Nông','Tam Nong District','tam_nong','87',7),
            ('872','Tháp Mười','Thap Muoi','Huyện Tháp Mười','Thap Muoi District','thap_muoi','87',7),
            ('873','Cao Lãnh','Cao Lanh','Huyện Cao Lãnh','Cao Lanh District','cao_lanh','87',7),
            ('874','Thanh Bình','Thanh Binh','Huyện Thanh Bình','Thanh Binh District','thanh_binh','87',7),
            ('875','Lấp Vò','Lap Vo','Huyện Lấp Vò','Lap Vo District','lap_vo','87',7),
            ('876','Lai Vung','Lai Vung','Huyện Lai Vung','Lai Vung District','lai_vung','87',7),
            ('877','Châu Thành','Chau Thanh','Huyện Châu Thành','Chau Thanh District','chau_thanh','87',7),
            ('883','Long Xuyên','Long Xuyen','Thành phố Long Xuyên','Long Xuyen City','long_xuyen','89',4),
            ('884','Châu Đốc','Chau Doc','Thành phố Châu Đốc','Chau Doc City','chau_doc','89',4),
            ('886','An Phú','An Phu','Huyện An Phú','An Phu District','an_phu','89',7),
            ('887','Tân Châu','Tan Chau','Thị xã Tân Châu','Tan Chau Town','tan_chau','89',6),
            ('888','Phú Tân','Phu Tan','Huyện Phú Tân','Phu Tan District','phu_tan','89',7),
            ('889','Châu Phú','Chau Phu','Huyện Châu Phú','Chau Phu District','chau_phu','89',7),
            ('890','Tịnh Biên','Tinh Bien','Thị xã Tịnh Biên','Tinh Bien Town','tinh_bien','89',6),
            ('891','Tri Tôn','Tri Ton','Huyện Tri Tôn','Tri Ton District','tri_ton','89',7),
            ('892','Châu Thành','Chau Thanh','Huyện Châu Thành','Chau Thanh District','chau_thanh','89',7),
            ('893','Chợ Mới','Cho Moi','Huyện Chợ Mới','Cho Moi District','cho_moi','89',7),
            ('894','Thoại Sơn','Thoai Son','Huyện Thoại Sơn','Thoai Son District','thoai_son','89',7),
            ('899','Rạch Giá','Rach Gia','Thành phố Rạch Giá','Rach Gia City','rach_gia','91',4),
            ('900','Hà Tiên','Ha Tien','Thành phố Hà Tiên','Ha Tien City','ha_tien','91',4),
            ('902','Kiên Lương','Kien Luong','Huyện Kiên Lương','Kien Luong District','kien_luong','91',7),
            ('903','Hòn Đất','Hon Dat','Huyện Hòn Đất','Hon Dat District','hon_dat','91',7),
            ('904','Tân Hiệp','Tan Hiep','Huyện Tân Hiệp','Tan Hiep District','tan_hiep','91',7),
            ('905','Châu Thành','Chau Thanh','Huyện Châu Thành','Chau Thanh District','chau_thanh','91',7),
            ('906','Giồng Riềng','Giong Rieng','Huyện Giồng Riềng','Giong Rieng District','giong_rieng','91',7),
            ('907','Gò Quao','Go Quao','Huyện Gò Quao','Go Quao District','go_quao','91',7),
            ('908','An Biên','An Bien','Huyện An Biên','An Bien District','an_bien','91',7),
            ('909','An Minh','An Minh','Huyện An Minh','An Minh District','an_minh','91',7),
            ('910','Vĩnh Thuận','Vinh Thuan','Huyện Vĩnh Thuận','Vinh Thuan District','vinh_thuan','91',7),
            ('911','Phú Quốc','Phu Quoc','Thành phố Phú Quốc','Phu Quoc City','phu_quoc','91',4),
            ('912','Kiên Hải','Kien Hai','Huyện Kiên Hải','Kien Hai District','kien_hai','91',7),
            ('913','U Minh Thượng','U Minh Thuong','Huyện U Minh Thượng','U Minh Thuong District','u_minh_thuong','91',7),
            ('914','Giang Thành','Giang Thanh','Huyện Giang Thành','Giang Thanh District','giang_thanh','91',7),
            ('916','Ninh Kiều','Ninh Kieu','Quận Ninh Kiều','Ninh Kieu District','ninh_kieu','92',5),
            ('917','Ô Môn','O Mon','Quận Ô Môn','O Mon District','o_mon','92',5),
            ('918','Bình Thuỷ','Binh Thuy','Quận Bình Thuỷ','Binh Thuy District','binh_thuy','92',5),
            ('919','Cái Răng','Cai Rang','Quận Cái Răng','Cai Rang District','cai_rang','92',5),
            ('923','Thốt Nốt','Thot Not','Quận Thốt Nốt','Thot Not District','thot_not','92',5),
            ('924','Vĩnh Thạnh','Vinh Thanh','Huyện Vĩnh Thạnh','Vinh Thanh District','vinh_thanh','92',7),
            ('925','Cờ Đỏ','Co Do','Huyện Cờ Đỏ','Co Do District','co_do','92',7),
            ('926','Phong Điền','Phong Dien','Huyện Phong Điền','Phong Dien District','phong_dien','92',7),
            ('927','Thới Lai','Thoi Lai','Huyện Thới Lai','Thoi Lai District','thoi_lai','92',7),
            ('930','Vị Thanh','Vi Thanh','Thành phố Vị Thanh','Vi Thanh City','vi_thanh','93',4),
            ('931','Ngã Bảy','Nga Bay','Thành phố Ngã Bảy','Nga Bay City','nga_bay','93',4),
            ('932','Châu Thành A','Chau Thanh A','Huyện Châu Thành A','Chau Thanh A District','chau_thanh_a','93',7),
            ('933','Châu Thành','Chau Thanh','Huyện Châu Thành','Chau Thanh District','chau_thanh','93',7),
            ('934','Phụng Hiệp','Phung Hiep','Huyện Phụng Hiệp','Phung Hiep District','phung_hiep','93',7),
            ('935','Vị Thuỷ','Vi Thuy','Huyện Vị Thuỷ','Vi Thuy District','vi_thuy','93',7),
            ('936','Long Mỹ','Long My','Huyện Long Mỹ','Long My District','long_my','93',7),
            ('937','Long Mỹ','Long My','Thị xã Long Mỹ','Long My Town','long_my','93',6),
            ('941','Sóc Trăng','Soc Trang','Thành phố Sóc Trăng','Soc Trang City','soc_trang','94',4),
            ('942','Châu Thành','Chau Thanh','Huyện Châu Thành','Chau Thanh District','chau_thanh','94',7),
            ('943','Kế Sách','Ke Sach','Huyện Kế Sách','Ke Sach District','ke_sach','94',7),
            ('944','Mỹ Tú','My Tu','Huyện Mỹ Tú','My Tu District','my_tu','94',7),
            ('945','Cù Lao Dung','Cu Lao Dung','Huyện Cù Lao Dung','Cu Lao Dung District','cu_lao_dung','94',7),
            ('946','Long Phú','Long Phu','Huyện Long Phú','Long Phu District','long_phu','94',7),
            ('947','Mỹ Xuyên','My Xuyen','Huyện Mỹ Xuyên','My Xuyen District','my_xuyen','94',7),
            ('948','Ngã Năm','Nga Nam','Thị xã Ngã Năm','Nga Nam Town','nga_nam','94',6),
            ('949','Thạnh Trị','Thanh Tri','Huyện Thạnh Trị','Thanh Tri District','thanh_tri','94',7),
            ('950','Vĩnh Châu','Vinh Chau','Thị xã Vĩnh Châu','Vinh Chau Town','vinh_chau','94',6),
            ('951','Trần Đề','Tran De','Huyện Trần Đề','Tran De District','tran_de','94',7),
            ('954','Bạc Liêu','Bac Lieu','Thành phố Bạc Liêu','Bac Lieu City','bac_lieu','95',4),
            ('956','Hồng Dân','Hong Dan','Huyện Hồng Dân','Hong Dan District','hong_dan','95',7),
            ('957','Phước Long','Phuoc Long','Huyện Phước Long','Phuoc Long District','phuoc_long','95',7),
            ('958','Vĩnh Lợi','Vinh Loi','Huyện Vĩnh Lợi','Vinh Loi District','vinh_loi','95',7),
            ('959','Giá Rai','Gia Rai','Thị xã Giá Rai','Gia Rai Town','gia_rai','95',6),
            ('960','Đông Hải','Dong Hai','Huyện Đông Hải','Dong Hai District','dong_hai','95',7),
            ('961','Hòa Bình','Hoa Binh','Huyện Hòa Bình','Hoa Binh District','hoa_binh','95',7),
            ('964','Cà Mau','Ca Mau','Thành phố Cà Mau','Ca Mau City','ca_mau','96',4),
            ('966','U Minh','U Minh','Huyện U Minh','U Minh District','u_minh','96',7),
            ('967','Thới Bình','Thoi Binh','Huyện Thới Bình','Thoi Binh District','thoi_binh','96',7),
            ('968','Trần Văn Thời','Tran Van Thoi','Huyện Trần Văn Thời','Tran Van Thoi District','tran_van_thoi','96',7),
            ('969','Cái Nước','Cai Nuoc','Huyện Cái Nước','Cai Nuoc District','cai_nuoc','96',7),
            ('970','Đầm Dơi','Dam Doi','Huyện Đầm Dơi','Dam Doi District','dam_doi','96',7),
            ('971','Năm Căn','Nam Can','Huyện Năm Căn','Nam Can District','nam_can','96',7),
            ('972','Phú Tân','Phu Tan','Huyện Phú Tân','Phu Tan District','phu_tan','96',7),
            ('973','Ngọc Hiển','Ngoc Hien','Huyện Ngọc Hiển','Ngoc Hien District','ngoc_hien','96',7)
        ON DUPLICATE KEY UPDATE
            Name                 = VALUES(Name),
            NameEn               = VALUES(NameEn),
            FullName             = VALUES(FullName),
            FullNameEn           = VALUES(FullNameEn),
            CodeName             = VALUES(CodeName),
            ProvinceCode         = VALUES(ProvinceCode),
            AdministrativeUnitID = VALUES(AdministrativeUnitID)
    `);

    try {
        await pool.execute(`CREATE INDEX idx_Districts_Province ON Districts(ProvinceCode)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
    
    try {
        await pool.execute(`CREATE INDEX idx_Districts_Unit ON Districts(AdministrativeUnitID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createUsersTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Users (
            UserID INT AUTO_INCREMENT PRIMARY KEY,
            FullName VARCHAR(255) NOT NULL,
            Email VARCHAR(255) NOT NULL UNIQUE,
            HashPassword VARCHAR(255),
            PhoneNumber VARCHAR(20),
            DateOfBirth DATE NULL,
            Gender ENUM('male','female','other') NULL,
            Address VARCHAR(512) NULL,
            AvatarURL TEXT,
            Role ENUM('guest', 'admin') DEFAULT 'guest',
            Rating DECIMAL(3,2) DEFAULT 0.0,
            IsVerified TINYINT(1) DEFAULT FALSE,
            VerificationToken VARCHAR(255),
            VerificationTokenExpires DATETIME,
            ResetToken VARCHAR(255),
            ResetTokenExpires DATETIME,
            Status ENUM('active','disabled','suspended','deleted') DEFAULT 'active',
            SuspendedUntil DATETIME NULL,
            UnpaidStrikeCount INT NOT NULL DEFAULT 0,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    try {
        await pool.execute(`CREATE INDEX idx_Users_Email ON Users(Email)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.execute(`CREATE INDEX idx_Users_Status ON Users(Status)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createOAuthAccountsTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS OAuthAccounts (
            ID INT AUTO_INCREMENT PRIMARY KEY,
            Provider VARCHAR(50) NOT NULL,
            ProviderUID VARCHAR(255) NOT NULL,
            UserID INT NOT NULL,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
            UNIQUE KEY unique_oauth (Provider, ProviderUID)
        )
    `);
}

async function createPaymentMethodsTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS PaymentMethods (
            MethodID INT PRIMARY KEY,
            AccountIdentifier VARCHAR(4),
            Token TEXT,
            Provider VARCHAR(15),
            IsDefault TINYINT(1) DEFAULT 0,
            UserID INT,
            CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (UserID) REFERENCES Users(UserID)
        )
    `);
    
    try {
        await pool.execute(`CREATE INDEX idx_PaymentMethods_UserID ON PaymentMethods(UserID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createPropertiesTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Properties (
            PropertyID INT AUTO_INCREMENT PRIMARY KEY,
            PropertyName VARCHAR(255),
            PropertyImageURL VARCHAR(255)
        )
    `);
}

async function createRoomTypesTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS RoomTypes (
            RoomTypeID INT AUTO_INCREMENT PRIMARY KEY,
            RoomTypeName VARCHAR(255),
            RoomTypeImageURL VARCHAR(255)
        )
    `);
}

async function createProductsTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Products (
            ProductID INT AUTO_INCREMENT PRIMARY KEY,
            UID BIGINT UNSIGNED,
            Source VARCHAR(20),
            ExternalID VARCHAR(30),
            Name VARCHAR(255),
            Address VARCHAR(255),
            ProvinceCode VARCHAR(20),
            DistrictCode VARCHAR(20),
            Latitude DECIMAL(9,6),
            Longitude DECIMAL(9,6),
            PropertyType INT,
            RoomType INT,
            MaxGuests SMALLINT,
            NumBedrooms SMALLINT,
            NumBeds SMALLINT,
            NumBathrooms SMALLINT,
            Price DECIMAL(10, 2),
            Currency VARCHAR(20),
            CleanlinessPoint FLOAT,
            LocationPoint FLOAT,
            ServicePoint FLOAT,
            ValuePoint FLOAT,
            CommunicationPoint FLOAT,
            ConveniencePoint FLOAT,
            is_deleted TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            LastSyncedAt TIMESTAMP NULL DEFAULT NULL,
            FOREIGN KEY (ProvinceCode) REFERENCES Provinces(ProvinceCode),
            FOREIGN KEY (DistrictCode) REFERENCES Districts(DistrictCode),
            FOREIGN KEY (PropertyType) REFERENCES Properties(PropertyID),
            FOREIGN KEY (RoomType) REFERENCES RoomTypes(RoomTypeID)
        )
    `);
    
    try {
        await pool.execute(`CREATE INDEX idx_Products_ProvinceCode ON Products(ProvinceCode)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
    
    try {
        await pool.execute(`CREATE INDEX idx_Products_DistrictCode ON Products(DistrictCode)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
    
    try {
        await pool.execute(`CREATE INDEX idx_Products_Price ON Products(Price)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.execute(`CREATE UNIQUE INDEX idx_Products_UID ON Products(UID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createFavoritesTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Favorites (
            FavoriteID INT AUTO_INCREMENT PRIMARY KEY,
            UserID INT NOT NULL,
            ProductID INT NOT NULL,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
            FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE CASCADE,
            UNIQUE KEY unique_user_product (UserID, ProductID)
        );
    `);

    try {
        await pool.execute(`CREATE INDEX idx_Favorites_UserID ON Favorites(UserID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createWishlistTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Wishlist (
            WishlistID INT AUTO_INCREMENT PRIMARY KEY,
            UserID INT NOT NULL,
            ProductID INT NOT NULL,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
            FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE CASCADE,
            UNIQUE KEY unique_user_product (UserID, ProductID)
        );
    `);

    try {
        await pool.execute(`CREATE INDEX idx_Wishlist_UserID ON Wishlist(UserID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createAmenityGroupsTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS AmenityGroups (
            AmenityGroupID INT AUTO_INCREMENT PRIMARY KEY,
            AmenityGroupName VARCHAR(255)
        )
    `);
}

async function createAmenitiesTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Amenities (
            AmenityID INT AUTO_INCREMENT PRIMARY KEY,
            AmenityName VARCHAR(255),
            AmenityGroupID INT,
            AmenityImageURL VARCHAR(255),
            FOREIGN KEY (AmenityGroupID) REFERENCES AmenityGroups(AmenityGroupID)
        )
    `);
}

async function createProductAmenitiesTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS ProductAmenities (
            ProductID INT NOT NULL,
            AmenityID INT NOT NULL,
            PRIMARY KEY (ProductID, AmenityID),
            FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE CASCADE,
            FOREIGN KEY (AmenityID) REFERENCES Amenities(AmenityID) ON DELETE CASCADE
        )
    `);
    
    try {
        await pool.execute(`CREATE INDEX idx_ProductAmenities_Product ON ProductAmenities(ProductID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
    
    try {
        await pool.execute(`CREATE INDEX idx_ProductAmenities_Amenity ON ProductAmenities(AmenityID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createAuctionTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Auction (
            AuctionID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            AuctionUID BIGINT UNSIGNED,
            ProductID INT,
            StayPeriodStart DATE,
            StayPeriodEnd DATE,
            StartTime TIMESTAMP NULL DEFAULT NULL,
            EndTime TIMESTAMP NULL DEFAULT NULL,
            MaxBidID INT UNSIGNED,
            StartPrice DECIMAL(10, 2),
            BidIncrement DECIMAL(10, 2),
            CurrentPrice DECIMAL(10, 2),
            Status ENUM('active','ended','cancelled') DEFAULT 'active',
            EndReason ENUM('natural_end','buy_now','cancelled','admin_force') NULL,
            FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
        )
    `);
    
    try {
        await pool.execute(`CREATE INDEX idx_Auction_ProductID ON Auction(ProductID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
    
    try {
        await pool.execute(`CREATE INDEX idx_Auction_StartTime ON Auction(StartTime)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
    
    try {
        await pool.execute(`CREATE INDEX idx_Auction_Status_EndTime ON Auction(Status, EndTime)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createBidsTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Bids (
            BidID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            AuctionID INT UNSIGNED,
            UserID INT,
            Amount DECIMAL(9, 2),
            BidTime TIMESTAMP,
            FOREIGN KEY (AuctionID) REFERENCES Auction(AuctionID),
            FOREIGN KEY (UserID) REFERENCES Users(UserID)
        )
    `);
    
    try {
        await pool.execute(`CREATE INDEX idx_Bids_AuctionID ON Bids(AuctionID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
    
    try {
        await pool.execute(`CREATE INDEX idx_Bids_UserID ON Bids(UserID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

     try {
        await pool.execute(`CREATE INDEX idx_Bids_AuctionBidTime ON Bids(AuctionID, BidTime)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createBookingTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Booking (
            BookingID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            BidID INT UNSIGNED DEFAULT NULL,
            UserID INT NOT NULL,
            ProductID INT NOT NULL,
            StartDate DATE NOT NULL,
            EndDate DATE NOT NULL,
            BookingStatus ENUM('pending','confirmed','cancelled','completed','expired') DEFAULT 'pending',
            UnitPrice DECIMAL(10, 2) DEFAULT 0.0,
            Amount DECIMAL(10, 2) DEFAULT 0.0,
            ServiceFee DECIMAL(10, 2) DEFAULT 0.0,
            PaymentMethodID INT DEFAULT NULL,
            PaidAt TIMESTAMP DEFAULT NULL,
            Source ENUM('direct','auction_win','auction_buy_now') NOT NULL DEFAULT 'direct',
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (BidID) REFERENCES Bids(BidID),
            FOREIGN KEY (UserID) REFERENCES Users(UserID),
            FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
            FOREIGN KEY (PaymentMethodID) REFERENCES PaymentMethods(MethodID)
        )
    `);

    // const dbname = dbConfig.database;
    // const triggerNames = ['bi_Booking_validate', 'bu_Booking_validate'];

    // const [trgRows] = await pool.query(
    //     `SELECT TRIGGER_NAME 
    //     FROM INFORMATION_SCHEMA.TRIGGERS 
    //     WHERE TRIGGER_SCHEMA = ? 
    //         AND TRIGGER_NAME IN (?, ?)`,
    //     [dbname, ...triggerNames]
    // );

    // for (const r of trgRows) {
    //     // schema-qualified DROP
    //     await pool.query(`DROP TRIGGER IF EXISTS \`${dbname}\`.\`${r.TRIGGER_NAME}\``);
    // }

    // const validateBody = `
    //     BEGIN
    //     END
    // `;

    // try {
    //     await pool.query(`
    //         CREATE TRIGGER \`${dbname}\`.\`bi_Booking_validate\`
    //         BEFORE INSERT ON \`${dbname}\`.\`Booking\`
    //         FOR EACH ROW
    //         ${validateBody}
    //     `);
    // } catch (error) {
    //     if (error.code !== 'ER_DUP_KEYNAME') throw error;
    // }

    // try {
    //     await pool.query(`
    //         CREATE TRIGGER \`${dbname}\`.\`bu_Booking_validate\`
    //         BEFORE UPDATE ON \`${dbname}\`.\`Booking\`
    //         FOR EACH ROW
    //         ${validateBody}
    //     `);
    // } catch (error) {
    //     if (error.code !== 'ER_DUP_KEYNAME') throw error;
    // }
    
    try {
        await pool.execute(`CREATE INDEX idx_Booking_UserID ON Booking(UserID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
    
    try {
        await pool.execute(`CREATE INDEX idx_Booking_ProductID ON Booking(ProductID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.execute(`CREATE INDEX idx_Booking_UserStatus ON Booking(UserID, BookingStatus)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.execute(`CREATE INDEX idx_Booking_ProductDates ON Booking(ProductID, StartDate, EndDate)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createCalendarTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Calendar (
            ProductID INT NOT NULL,
            Day DATE NOT NULL,
            Status ENUM('available','reserved','booked','blocked') NOT NULL DEFAULT 'available',
            LockReason ENUM('booking_hold','manual','auction','external_sync') NULL,
            BookingID INT UNSIGNED NULL,    -- nếu status=reserved/booked
            AuctionID INT UNSIGNED NULL,    -- nếu status=auction
            HoldExpiresAt DATETIME NULL,  -- cho “giữ chỗ tạm” (reserve)
            CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (ProductID, Day)
        );
    `);

    const dbname = dbConfig.database;
    const triggerNames = ['bi_Calendar_validate', 'bu_Calendar_validate', 'bi_Calendar_refcheck', 'bu_Calendar_refcheck'];

    // Kiểm tra tồn tại trong INFORMATION_SCHEMA rồi DROP từng cái
    const [trgRows] = await pool.query(
        `SELECT TRIGGER_NAME 
        FROM INFORMATION_SCHEMA.TRIGGERS 
        WHERE TRIGGER_SCHEMA = ? 
            AND TRIGGER_NAME IN (?, ?, ?, ?)`,
        [dbname, ...triggerNames]
    );

    for (const r of trgRows) {
        // schema-qualified DROP
        await pool.query(`DROP TRIGGER IF EXISTS \`${dbname}\`.\`${r.TRIGGER_NAME}\``);
    }

    const validateBody = `
        BEGIN
        IF NEW.Status = 'available' THEN
            SET NEW.BookingID = NULL,
                NEW.AuctionID = NULL,
                NEW.LockReason = NULL,
                NEW.HoldExpiresAt = NULL;

        ELSEIF NEW.Status = 'reserved' THEN
            IF NEW.LockReason IS NULL THEN SET NEW.LockReason = 'booking_hold'; END IF;
            IF NOT (NEW.LockReason = 'booking_hold' AND NEW.BookingID IS NOT NULL AND NEW.HoldExpiresAt IS NOT NULL) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'reserved: require LockReason=booking_hold, BookingID, HoldExpiresAt';
            END IF;
            SET NEW.AuctionID = NULL;

        ELSEIF NEW.Status = 'booked' THEN
            IF NEW.BookingID IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'booked: require BookingID';
            END IF;
            SET NEW.LockReason = NULL,
                NEW.HoldExpiresAt = NULL,
                NEW.AuctionID = NULL;

        ELSEIF NEW.Status = 'blocked' THEN
            IF NEW.LockReason = 'auction' THEN
                IF NEW.AuctionID IS NULL THEN
                    SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'blocked(auction): require AuctionID';
                END IF;
                SET NEW.BookingID = NULL,
                    NEW.HoldExpiresAt = NULL;

            ELSEIF NEW.LockReason IN ('manual','external_sync') THEN
                SET NEW.BookingID = NULL,
                    NEW.AuctionID = NULL,
                    NEW.HoldExpiresAt = NULL;

            ELSE
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'blocked: LockReason must be auction/manual/external_sync';
            END IF;

        ELSE
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown Status';
        END IF;
        END
    `;

    try {
        await pool.query(`
            CREATE TRIGGER \`${dbname}\`.\`bi_Calendar_validate\`
            BEFORE INSERT ON \`${dbname}\`.\`Calendar\`
            FOR EACH ROW
            ${validateBody}
        `);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.query(`
            CREATE TRIGGER \`${dbname}\`.\`bu_Calendar_validate\`
            BEFORE UPDATE ON \`${dbname}\`.\`Calendar\`
            FOR EACH ROW
            ${validateBody}
        `);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
    
    const refcheckBody = `
    BEGIN
        DECLARE v_exists INT;

        -- Product phải tồn tại
        SELECT 1 INTO v_exists FROM Products WHERE Products.ProductID = NEW.ProductID LIMIT 1;
        IF v_exists IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ProductID not found';
        END IF;

        -- BookingID nếu có phải tồn tại
        IF NEW.BookingID IS NOT NULL THEN
            SET v_exists = NULL;
            SELECT 1 INTO v_exists FROM Booking WHERE Booking.BookingID = NEW.BookingID LIMIT 1;
            IF v_exists IS NULL THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'BookingID not found';
            END IF;
        END IF;

        -- AuctionID nếu có phải tồn tại
        IF NEW.AuctionID IS NOT NULL THEN
            SET v_exists = NULL;
            SELECT 1 INTO v_exists FROM Auction WHERE Auction.AuctionID = NEW.AuctionID LIMIT 1;
            IF v_exists IS NULL THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AuctionID not found';
            END IF;
        END IF;
    END`;

    try {
        await pool.query(`
            CREATE TRIGGER \`${dbname}\`.\`bi_Calendar_refcheck\`
            BEFORE INSERT ON \`${dbname}\`.\`Calendar\`
            FOR EACH ROW
            ${refcheckBody}
        `);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.query(`
            CREATE TRIGGER \`${dbname}\`.\`bu_Calendar_refcheck\`
            BEFORE UPDATE ON \`${dbname}\`.\`Calendar\`
            FOR EACH ROW
            ${refcheckBody}
        `);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.execute(`CREATE INDEX idx_Calendar_BookingID ON Calendar(BookingID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.execute(`CREATE INDEX idx_Calendar_AuctionID ON Calendar(AuctionID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.execute(`CREATE INDEX idx_Calendar_Day ON Calendar(Day)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.execute(`CREATE INDEX idx_Calendar_StatusDayProductID ON Calendar(Status, Day, ProductID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    const [pinfo] = await pool.query(`
        SELECT 
        SUM(CASE WHEN PARTITION_NAME IS NOT NULL THEN 1 ELSE 0 END) AS part_count,
        SUM(CASE WHEN PARTITION_NAME = 'pmax' THEN 1 ELSE 0 END)    AS has_pmax
        FROM information_schema.PARTITIONS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Calendar';
    `, [dbname]);

    const partCount = Number(pinfo?.[0]?.part_count || 0);
    const hasPmax   = Number(pinfo?.[0]?.has_pmax   || 0);

    if (partCount === 0) {
        // Bảng chưa partition -> thêm scheme với pmax
        await pool.query(`
        ALTER TABLE \`${dbname}\`.\`Calendar\`
        PARTITION BY RANGE COLUMNS(Day) (
            PARTITION pmax VALUES LESS THAN (MAXVALUE)
        );
        `);
    } else if (hasPmax === 0) {
        // Đã partition nhưng thiếu pmax -> bổ sung pmax
        await pool.query(`
        ALTER TABLE \`${dbname}\`.\`Calendar\`
        ADD PARTITION (
            PARTITION pmax VALUES LESS THAN (MAXVALUE)
        );
        `);
    }
}

async function createPaymentsTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Payments (
            PaymentID BIGINT AUTO_INCREMENT PRIMARY KEY,
            BookingID INT UNSIGNED NOT NULL,
            UserID INT NOT NULL,
            Amount DECIMAL(10,2) NOT NULL,
            Currency VARCHAR(10) NOT NULL DEFAULT 'VND',
            Provider VARCHAR(50) NOT NULL,
            ProviderTxnID VARCHAR(128) NULL,
            Status ENUM('initiated','authorized','captured','failed','refunded','voided') NOT NULL DEFAULT 'initiated',
            FailureReason VARCHAR(255) NULL,
            CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UpdatedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (BookingID) REFERENCES Booking(BookingID),
            FOREIGN KEY (UserID) REFERENCES Users(UserID),
            UNIQUE KEY uq_provider_txn (Provider, ProviderTxnID)
        );
    `);

    try {
        await pool.execute(`CREATE INDEX idx_Payments_BookingID ON Payments(BookingID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.execute(`CREATE INDEX idx_Payments_UserID ON Payments(UserID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.execute(`CREATE INDEX idx_Payments_Status ON Payments(Status)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }

    try {
        await pool.execute(`CREATE INDEX idx_Payments_CreatedAt ON Payments(CreatedAt)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createUserViolationsTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS UserViolations (
            ViolationID BIGINT AUTO_INCREMENT PRIMARY KEY,
            UserID INT NOT NULL,
            BookingID INT UNSIGNED NULL,
            Kind ENUM('non_payment') NOT NULL,
            Note VARCHAR(255) NULL,
            CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_user_booking_kind (UserID, BookingID, Kind),
            INDEX idx_user_kind (UserID, Kind),
            FOREIGN KEY (UserID) REFERENCES Users(UserID),
            FOREIGN KEY (BookingID) REFERENCES Booking(BookingID) ON DELETE SET NULL
        );
    `);

    try {
        await pool.execute(`CREATE INDEX idx_UserViolations_BookingID ON UserViolations(BookingID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

async function createEmailOutboxTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS EmailOutbox (
            EmailID BIGINT AUTO_INCREMENT PRIMARY KEY,
            ToEmail VARCHAR(255) NOT NULL,
            Subject VARCHAR(255) NOT NULL,
            Body TEXT NOT NULL,
            SendAfter DATETIME DEFAULT CURRENT_TIMESTAMP,
            Meta JSON NULL,
            ProcessedAt DATETIME NULL,
            CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_unprocessed (ProcessedAt)
        );
    `);
}

async function createRatingTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS Rating (
            RatingID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            UserID INT NOT NULL,
            BookingID INT UNSIGNED,
            ProductID INT,
            CleanlinessPoint FLOAT,
            LocationPoint FLOAT,
            ServicePoint FLOAT,
            ValuePoint FLOAT,
            CommunicationPoint FLOAT,
            ConveniencePoint FLOAT,
            Comment TEXT,
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_rating_booking_user (BookingID, UserID),
            FOREIGN KEY (UserID) REFERENCES Users(UserID),
            FOREIGN KEY (BookingID) REFERENCES Booking(BookingID),
            FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
        )
    `);
    
    try {
        await pool.execute(`CREATE INDEX idx_Rating_ProductID ON Rating(ProductID)`);
    } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
}

// Trigger
async function dropUpdateRoomTypesTriggerIfExists() {
    await pool.query(`
        DROP TRIGGER IF EXISTS before_insert_products;
    `);
}

async function createUpdateRoomTypesTrigger() {
    await pool.query(`
        CREATE TRIGGER before_insert_products
        BEFORE INSERT ON Products
        FOR EACH ROW
        BEGIN
            DECLARE new_type INT DEFAULT 2; -- mặc định Căn hộ
            DECLARE pname VARCHAR(255);

            -- chuẩn hóa tên (lowercase)
            SET pname = LOWER(NEW.Name);

            -- check các keyword
            IF pname LIKE '%resort%' THEN
                SET new_type = 4; -- Resort
            ELSEIF pname LIKE '%studio%' THEN
                SET new_type = 6; -- Studio
            ELSEIF pname LIKE '%khách sạn%' OR pname LIKE '%khach san%' OR pname LIKE '%hotel%' THEN
                SET new_type = 1; -- Khách sạn
            ELSEIF pname LIKE '%biệt thự%' OR pname LIKE '%biet thu%' OR pname LIKE '%villa%' THEN
                SET new_type = 5; -- Biệt thự
            ELSEIF pname LIKE '%căn hộ%' OR pname LIKE '%can ho%' OR pname LIKE '%apartment%' THEN
                SET new_type = 2; -- Căn hộ
            ELSEIF pname LIKE '%nhà nghỉ%' OR pname LIKE '%nha nghi%' OR pname LIKE '%motel%' THEN
                SET new_type = 7; -- Nhà nghỉ
            ELSEIF pname LIKE '%nhà%' OR pname LIKE '%nha%' OR pname LIKE '%homestay%' THEN
                SET new_type = 3; -- Homestay
            END IF;

            -- chỉ gán RoomType nếu chưa được set khi insert
            IF NEW.RoomType IS NULL THEN
                SET NEW.RoomType = new_type;
            END IF;
        END;
    `);
}

// Procedure
async function dropUpsertPropertyProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS UpsertProperty;
    `);
}

async function createUpsertPropertyProcedure() {
    await pool.query(`
        CREATE PROCEDURE UpsertProperty(IN p_PropertyName VARCHAR(255))
        BEGIN
            DECLARE v_PropertyID INT;
            DECLARE v_OldName VARCHAR(255);

            SELECT PropertyID, PropertyName INTO v_PropertyID, v_OldName
            FROM Properties
            WHERE PropertyName = p_PropertyName
            LIMIT 1;

            IF v_PropertyID IS NULL THEN
                INSERT INTO Properties(PropertyName, PropertyImageURL)
                VALUES(p_PropertyName, NULL);
            ELSE
                IF v_OldName <> p_PropertyName THEN
                    UPDATE Properties
                    SET PropertyName = p_PropertyName
                    WHERE PropertyID = v_PropertyID;
                END IF;
            END IF;
        END;
    `);
}

async function dropUpsertRoomTypeProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS UpsertRoomType;
    `);
}

async function createUpsertRoomTypeProcedure() {
    await pool.query(`
        CREATE PROCEDURE UpsertRoomType(IN p_RoomTypeName VARCHAR(255))
        BEGIN
            DECLARE v_RoomTypeID INT;
            DECLARE v_OldName VARCHAR(255);

            SELECT RoomTypeID, RoomTypeName INTO v_RoomTypeID, v_OldName
            FROM RoomTypes
            WHERE RoomTypeName = p_RoomTypeName
            LIMIT 1;

            IF v_RoomTypeID IS NULL THEN
                INSERT INTO RoomTypes(RoomTypeName, RoomTypeImageURL)
                VALUES(p_RoomTypeName, NULL);
            ELSE
                IF v_OldName <> p_RoomTypeName THEN
                    UPDATE RoomTypes
                    SET RoomTypeName = p_RoomTypeName
                    WHERE RoomTypeID = v_RoomTypeID;
                END IF;
            END IF;
        END;
    `);
}

async function dropUpsertProductProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS UpsertProduct;
    `);
}

async function createUpsertProductProcedure() {
    await pool.query(`
        CREATE PROCEDURE UpsertProduct(
            IN p_UID BIGINT UNSIGNED,
            IN p_ExternalID VARCHAR(30),
            IN p_Source VARCHAR(20),
            IN p_Name VARCHAR(255),
            IN p_Address VARCHAR(255),
            IN p_ProvinceCode VARCHAR(20),
            IN p_DistrictCode VARCHAR(20),
            IN p_Latitude FLOAT,
            IN p_Longitude FLOAT,
            IN p_PropertyType INT,
            IN p_RoomType INT,
            IN p_MaxGuests SMALLINT,
            IN p_NumBedrooms SMALLINT,
            IN p_NumBeds SMALLINT,
            IN p_NumBathrooms SMALLINT,
            IN p_Price DECIMAL(10,2),
            IN p_Currency VARCHAR(20),
            IN p_Cleanliness FLOAT,
            IN p_Location FLOAT,
            IN p_Service FLOAT,
            IN p_Value FLOAT,
            IN p_Communication FLOAT,
            IN p_Convenience FLOAT,
            IN p_CreatedAt TIMESTAMP,
            IN p_LastSyncedAt TIMESTAMP
        )
        BEGIN
            DECLARE v_ProductID INT;

            SELECT ProductID INTO v_ProductID
            FROM Products
            WHERE ExternalID = p_ExternalID
            LIMIT 1;

            IF v_ProductID IS NULL THEN
                -- Insert nếu chưa có
                INSERT INTO Products(UID, Source, ExternalID, Name, Address, ProvinceCode, DistrictCode, Latitude, Longitude,
                                    PropertyType, RoomType, MaxGuests, NumBedrooms, NumBeds, NumBathrooms, Price, Currency,
                                    CleanlinessPoint, LocationPoint, ServicePoint, ValuePoint, CommunicationPoint, ConveniencePoint,
                                    CreatedAt, LastSyncedAt)
                VALUES(p_UID, p_Source, p_ExternalID, p_Name, p_Address, p_ProvinceCode, p_DistrictCode, p_Latitude, p_Longitude,
                    p_PropertyType, p_RoomType, p_MaxGuests, p_NumBedrooms, p_NumBeds, p_NumBathrooms, p_Price, p_Currency,
                    p_Cleanliness, p_Location, p_Service, p_Value, p_Communication, p_Convenience,
                    p_CreatedAt, p_LastSyncedAt);
            ELSE
                -- Chỉ update nếu có sự khác biệt
                IF EXISTS (
                    SELECT 1 FROM Products
                    WHERE ProductID = v_ProductID
                    AND (
                        Source <> p_Source OR
                        Name <> p_Name OR
                        Address <> p_Address OR
                        ProvinceCode <> p_ProvinceCode OR
                        DistrictCode <> p_DistrictCode OR
                        Latitude <> p_Latitude OR
                        Longitude <> p_Longitude OR
                        PropertyType <> p_PropertyType OR
                        RoomType <> p_RoomType OR
                        MaxGuests <> p_MaxGuests OR
                        NumBedrooms <> p_NumBedrooms OR
                        NumBeds <> p_NumBeds OR
                        NumBathrooms <> p_NumBathrooms OR
                        Price <> p_Price OR
                        Currency <> p_Currency OR
                        CleanlinessPoint <> p_Cleanliness OR
                        LocationPoint <> p_Location OR
                        ServicePoint <> p_Service OR
                        ValuePoint <> p_Value OR
                        CommunicationPoint <> p_Communication OR
                        ConveniencePoint <> p_Convenience
                    )
                ) THEN
                    UPDATE Products
                    SET 
                        Source = p_Source,
                        Name = p_Name,
                        Address = p_Address,
                        ProvinceCode = p_ProvinceCode,
                        DistrictCode = p_DistrictCode,
                        Latitude = p_Latitude,
                        Longitude = p_Longitude,
                        PropertyType = p_PropertyType,
                        RoomType = p_RoomType,
                        MaxGuests = p_MaxGuests,
                        NumBedrooms = p_NumBedrooms,
                        NumBeds = p_NumBeds,
                        NumBathrooms = p_NumBathrooms,
                        Price = CASE WHEN p_Price > 0 THEN p_Price ELSE Price END,
                        Currency = p_Currency,
                        CleanlinessPoint = p_Cleanliness,
                        LocationPoint = p_Location,
                        ServicePoint = p_Service,
                        ValuePoint = p_Value,
                        CommunicationPoint = p_Communication,
                        ConveniencePoint = p_Convenience,
                        CreatedAt = p_CreatedAt,
                        LastSyncedAt = p_LastSyncedAt
                    WHERE ProductID = v_ProductID;
                ELSE
                    -- Chỉ cập nhật thời gian đồng bộ nếu không thay đổi gì khác
                    UPDATE Products
                    SET LastSyncedAt = p_LastSyncedAt
                    WHERE ProductID = v_ProductID;
                END IF;
            END IF;
        END;
    `);
}

async function dropAddToFavoritesProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS AddToFavorites;
    `);
}

async function dropRemoveFromFavoritesProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS RemoveFromFavorites;
    `);
}

async function createAddToFavoritesProcedure() {
    await pool.query(`
        CREATE PROCEDURE AddToFavorites(
            IN p_UserID INT,
            IN p_ProductID INT
        )
        BEGIN
            DECLARE v_Count INT DEFAULT 0;
            DECLARE v_UserExists INT DEFAULT 0;
            DECLARE v_ProductExists INT DEFAULT 0;
            
            SELECT COUNT(*) INTO v_UserExists 
            FROM Users 
            WHERE UserID = p_UserID;
            
            SELECT COUNT(*) INTO v_ProductExists 
            FROM Products 
            WHERE ProductID = p_ProductID;
            
            IF v_UserExists = 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
            END IF;
            
            IF v_ProductExists = 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Product not found';
            END IF;
            
            SELECT COUNT(*) INTO v_Count
            FROM Favorites
            WHERE UserID = p_UserID AND ProductID = p_ProductID;
            
            IF v_Count = 0 THEN
                INSERT INTO Favorites(UserID, ProductID, CreatedAt)
                VALUES(p_UserID, p_ProductID, NOW());
                
                SELECT 'SUCCESS' AS Status, 'Product added to favorites' AS Message;
            ELSE
                SELECT 'INFO' AS Status, 'Product already in favorites' AS Message;
            END IF;
        END;
    `);
}

async function createRemoveFromFavoritesProcedure() {
    await pool.query(`
        CREATE PROCEDURE RemoveFromFavorites(
            IN p_UserID INT,
            IN p_ProductID INT
        )
        BEGIN
            DECLARE v_Count INT DEFAULT 0;
            
            SELECT COUNT(*) INTO v_Count
            FROM Favorites
            WHERE UserID = p_UserID AND ProductID = p_ProductID;
            
            IF v_Count > 0 THEN
                DELETE FROM Favorites
                WHERE UserID = p_UserID AND ProductID = p_ProductID;
                
                SELECT 'SUCCESS' AS Status, 'Product removed from favorites' AS Message;
            ELSE
                SELECT 'INFO' AS Status, 'Product not found in favorites' AS Message;
            END IF;
        END;
    `);
}

async function dropGetUserFavoritesProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS GetUserFavorites;
    `);
}

async function createGetUserFavoritesProcedure() {
    await pool.query(`
        CREATE PROCEDURE GetUserFavorites(
            IN p_UserID INT,
            IN p_Limit INT,
            IN p_Offset INT
        )
        BEGIN
            SELECT 
                f.FavoriteID,
                f.UserID,
                f.ProductID,
                f.CreatedAt,
                p.UID,
                p.Name AS ProductName,
                p.Address,
                p.Price,
                p.Currency,
                prop.PropertyName,
                rt.RoomTypeName,
                prov.Name AS ProvinceName,
                ROUND((
                    COALESCE(p.CleanlinessPoint, 0) + 
                    COALESCE(p.LocationPoint, 0) + 
                    COALESCE(p.ServicePoint, 0) + 
                    COALESCE(p.ValuePoint, 0) + 
                    COALESCE(p.CommunicationPoint, 0) + 
                    COALESCE(p.ConveniencePoint, 0)
                ) / 6, 2) AS AverageRating
            FROM Favorites f
            JOIN Products p ON f.ProductID = p.ProductID
            LEFT JOIN Properties prop ON p.PropertyType = prop.PropertyID
            LEFT JOIN RoomTypes rt ON p.RoomType = rt.RoomTypeID
            LEFT JOIN Provinces prov ON p.ProvinceCode = prov.ProvinceCode
            WHERE f.UserID = p_UserID
            ORDER BY f.CreatedAt DESC
            LIMIT p_Limit OFFSET p_Offset;
        END;
    `);
}

async function dropUpsertAmenityGroupProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS UpsertAmenityGroup;
    `);
}

async function createUpsertAmenityGroupProcedure() {
    await pool.query(`
        CREATE PROCEDURE UpsertAmenityGroup(IN p_GroupName VARCHAR(255))
        BEGIN
            DECLARE v_GroupID INT;
            DECLARE v_OldName VARCHAR(255);

            SELECT AmenityGroupID, AmenityGroupName INTO v_GroupID, v_OldName
            FROM AmenityGroups
            WHERE AmenityGroupName = p_GroupName
            LIMIT 1;

            IF v_GroupID IS NULL THEN
                INSERT INTO AmenityGroups(AmenityGroupName)
                VALUES(p_GroupName);
            ELSE
                IF v_OldName <> p_GroupName THEN
                    UPDATE AmenityGroups
                    SET AmenityGroupName = p_GroupName
                    WHERE AmenityGroupID = v_GroupID;
                END IF;
            END IF;
        END;
    `);
}

async function dropUpsertAmenityProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS UpsertAmenity;
    `);
}

async function createUpsertAmenityProcedure() {
    await pool.query(`
        CREATE PROCEDURE UpsertAmenity(IN p_AmenityName VARCHAR(255), IN p_GroupID INT)
        BEGIN
            DECLARE v_AmenityID INT;
            DECLARE v_OldName VARCHAR(255);
            DECLARE v_OldGroupID INT;

            SELECT AmenityID, AmenityName, AmenityGroupID INTO v_AmenityID, v_OldName, v_OldGroupID
            FROM Amenities
            WHERE AmenityName = p_AmenityName
            LIMIT 1;

            IF v_AmenityID IS NULL THEN
                INSERT INTO Amenities(AmenityName, AmenityGroupID, AmenityImageURL)
                VALUES(p_AmenityName, p_GroupID, NULL);
            ELSE
                IF v_OldName <> p_AmenityName OR v_OldGroupID <> p_GroupID THEN
                    UPDATE Amenities
                    SET AmenityName = p_AmenityName,
                        AmenityGroupID = p_GroupID
                    WHERE AmenityID = v_AmenityID;
                END IF;
            END IF;
        END;
    `);
}

async function dropUpsertProductAmenityProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS UpsertProductAmenity;
    `);
}

async function createUpsertProductAmenityProcedure() {
    await pool.query(`
        CREATE PROCEDURE UpsertProductAmenity(IN p_ProductID INT, IN p_AmenityID INT)
        BEGIN
            DECLARE v_Count INT;

            SELECT COUNT(*) INTO v_Count
            FROM ProductAmenities
            WHERE ProductID = p_ProductID AND AmenityID = p_AmenityID;

            IF v_Count = 0 THEN
                INSERT INTO ProductAmenities(ProductID, AmenityID)
                VALUES(p_ProductID, p_AmenityID);
            END IF;
            -- Không có gì để update nên không cần phần ELSE
        END;
    `);
}

async function dropUpsertRatingProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS UpsertRating;
    `);
}

async function createUpsertRatingProcedure() {
    await pool.query(`
        CREATE PROCEDURE UpsertRating(
            IN p_ExternalID VARCHAR(30),
            IN p_BookingID INT,
            IN p_ProductID INT,
            IN p_Cleanliness FLOAT,
            IN p_Location FLOAT,
            IN p_Service FLOAT,
            IN p_Value FLOAT,
            IN p_Communication FLOAT,
            IN p_Convenience FLOAT
        )
        BEGIN
            DECLARE v_RatingID INT;
            
            SELECT RatingID INTO v_RatingID
            FROM Rating
            WHERE ExternalID = p_ExternalID
            LIMIT 1;
            
            IF v_RatingID IS NULL THEN
                INSERT INTO Rating(ExternalID, BookingID, ProductID, CleanlinessPoint, LocationPoint,
                                ServicePoint, ValuePoint, CommunicationPoint, ConveniencePoint)
                VALUES(p_ExternalID, p_BookingID, p_ProductID, p_Cleanliness, p_Location,
                    p_Service, p_Value, p_Communication, p_Convenience);
            ELSE
                UPDATE Rating
                SET BookingID = p_BookingID,
                    ProductID = p_ProductID,
                    CleanlinessPoint = p_Cleanliness,
                    LocationPoint = p_Location,
                    ServicePoint = p_Service,
                    ValuePoint = p_Value,
                    CommunicationPoint = p_Communication,
                    ConveniencePoint = p_Convenience
                WHERE RatingID = v_RatingID;
            END IF;
        END;
    `);
}

async function dropGetTopProductsByProvinceProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS GetTopProductsByProvince;
    `);
}

async function createGetTopProductsByProvinceProcedure() {
    await pool.query(`
        CREATE PROCEDURE GetTopProductsByProvince(
            IN province_code_input VARCHAR(20),
            IN limit_input INT
        )
        BEGIN
            SELECT 
                p.ProductID,
                p.UID,
                p.ExternalID,
                p.Name,
                p.Address,
                prov.Name AS ProvinceName,
                disct.Name AS DistrictName,
                p.ProvinceCode,
                p.DistrictCode,
                prop.PropertyName,
                p.Price,
                p.Currency,
                p.CleanlinessPoint,
                p.LocationPoint,
                p.ServicePoint,
                p.ValuePoint,
                p.CommunicationPoint,
                p.ConveniencePoint,
                ROUND((
                    COALESCE(p.CleanlinessPoint, 0) + 
                    COALESCE(p.LocationPoint, 0) + 
                    COALESCE(p.ServicePoint, 0) + 
                    COALESCE(p.ValuePoint, 0) + 
                    COALESCE(p.CommunicationPoint, 0) + 
                    COALESCE(p.ConveniencePoint, 0)
                ) / 6, 2) AS AverageRating,
                prop.PropertyName,
                prop.PropertyImageURL,
                rt.RoomTypeName,
                rt.RoomTypeImageURL
            FROM Products p
            LEFT JOIN Properties prop ON p.PropertyType = prop.PropertyID
            LEFT JOIN RoomTypes rt ON p.RoomType = rt.RoomTypeID
            LEFT JOIN Provinces prov ON p.ProvinceCode = prov.ProvinceCode
            LEFT JOIN Districts disct ON p.DistrictCode = disct.DistrictCode
            WHERE p.ProvinceCode = province_code_input
                AND p.CleanlinessPoint IS NOT NULL
                AND p.LocationPoint IS NOT NULL  
                AND p.ServicePoint IS NOT NULL
                AND p.ValuePoint IS NOT NULL
                AND p.CommunicationPoint IS NOT NULL
                AND p.ConveniencePoint IS NOT NULL
            ORDER BY AverageRating DESC
            LIMIT limit_input;
        END;
    `);
}

async function dropGetTopProductsByDistrictProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS GetTopProductsByDistrict;
    `);
}

async function createGetTopProductsByDistrictProcedure() {
    await pool.query(`
        CREATE PROCEDURE GetTopProductsByDistrict(
            IN district_code_input VARCHAR(20),
            IN limit_input INT
        )
        BEGIN
            SELECT 
                p.ProductID,
                p.UID,
                p.ExternalID,
                p.Name,
                p.Address,
                prov.Name AS ProvinceName,
                disct.Name AS DistrictName,
                p.ProvinceCode,
                p.DistrictCode,
                prop.PropertyName,
                p.Price,
                p.Currency,
                p.CleanlinessPoint,
                p.LocationPoint,
                p.ServicePoint,
                p.ValuePoint,
                p.CommunicationPoint,
                p.ConveniencePoint,
                ROUND((
                    COALESCE(p.CleanlinessPoint, 0) + 
                    COALESCE(p.LocationPoint, 0) + 
                    COALESCE(p.ServicePoint, 0) + 
                    COALESCE(p.ValuePoint, 0) + 
                    COALESCE(p.CommunicationPoint, 0) + 
                    COALESCE(p.ConveniencePoint, 0)
                ) / 6, 2) AS AverageRating,
                prop.PropertyName,
                prop.PropertyImageURL,
                rt.RoomTypeName,
                rt.RoomTypeImageURL
            FROM Products p
            LEFT JOIN Properties prop ON p.PropertyType = prop.PropertyID
            LEFT JOIN RoomTypes rt ON p.RoomType = rt.RoomTypeID
            LEFT JOIN Provinces prov ON p.ProvinceCode = prov.ProvinceCode
            LEFT JOIN Districts disct ON p.DistrictCode = disct.DistrictCode
            WHERE p.DistrictCode = district_code_input
                AND p.CleanlinessPoint IS NOT NULL
                AND p.LocationPoint IS NOT NULL  
                AND p.ServicePoint IS NOT NULL
                AND p.ValuePoint IS NOT NULL
                AND p.CommunicationPoint IS NOT NULL
                AND p.ConveniencePoint IS NOT NULL
            ORDER BY AverageRating DESC
            LIMIT limit_input;
        END;
    `);
}

async function dropGetPopularProvincesProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS GetPopularProvinces;
    `);
}

async function createGetPopularProvincesProcedure() {
    await pool.query(`
        CREATE PROCEDURE GetPopularProvinces(IN p_limit INT)
        BEGIN
            SELECT 
                prov.ProvinceCode AS code,
                prov.Name,
                prov.NameEn,
                prov.FullName,
                prov.CodeName,
                COUNT(p.ProductID) AS ProductCount,
                'province' AS type
            FROM Provinces prov
            LEFT JOIN Products p 
                ON prov.ProvinceCode = p.ProvinceCode
            GROUP BY 
                prov.ProvinceCode, 
                prov.Name, 
                prov.NameEn, 
                prov.FullName, 
                prov.FullNameEn, 
                prov.CodeName
            HAVING ProductCount > 0
            ORDER BY 
                ProductCount DESC, 
                prov.Name ASC
            LIMIT p_limit;
        END;
    `);
}

async function dropGetPopularDistrictsProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS GetPopularDistricts;
    `);
}

async function createGetPopularDistrictsProcedure() {
    await pool.query(`
        CREATE PROCEDURE GetPopularDistricts(IN p_limit INT)
        BEGIN
            SELECT 
                disct.DistrictCode AS code,
                disct.Name,
                disct.NameEn,
                disct.FullName,
                disct.CodeName,
                COUNT(p.ProductID) AS ProductCount,
                'district' AS type
            FROM Districts disct
            LEFT JOIN Products p 
                ON disct.DistrictCode = p.DistrictCode
            GROUP BY 
                disct.DistrictCode, 
                disct.Name, 
                disct.NameEn, 
                disct.FullName,
                disct.CodeName
            HAVING ProductCount > 0
            ORDER BY 
                ProductCount DESC, 
                disct.Name ASC
            LIMIT p_limit;
        END;
    `);
}

async function dropSearchProvincesProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS SearchProvinces;
    `);
}

async function createSearchProvincesProcedure() {
    await pool.query(`
        CREATE PROCEDURE SearchProvinces(
            IN p_name VARCHAR(255),
            IN p_limit INT
        )
        BEGIN
            SELECT 
                ProvinceCode AS code,
                Name,
                NameEn,
                FullName,
                FullNameEn,
                CodeName,
                'province' AS type
            FROM Provinces
            WHERE 
                Name = p_name OR 
                NameEn = p_name OR 
                FullName = p_name OR 
                FullNameEn = p_name OR 
                CodeName = p_name
            ORDER BY 
                CASE 
                    WHEN Name = p_name THEN 1
                    WHEN FullName = p_name THEN 2
                    ELSE 3
                END,
                Name ASC
            LIMIT p_limit;
        END;
    `);
}

async function dropSearchDistrictsProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS SearchDistricts;
    `);
}

async function createSearchDistrictsProcedure() {
    await pool.query(`
        CREATE PROCEDURE SearchDistricts(
            IN p_name VARCHAR(255),
            IN p_limit INT
        )
        BEGIN
            SELECT 
                d.DistrictCode AS code,
                d.Name,
                d.NameEn,
                d.FullName,
                d.FullNameEn,
                d.CodeName,
                d.ProvinceCode,
                p.Name AS ProvinceName,
                p.NameEn AS ProvinceNameEn,
                'district' AS type
            FROM Districts d
            LEFT JOIN Provinces p 
                ON d.ProvinceCode = p.ProvinceCode
            WHERE 
                d.Name = p_name OR 
                d.NameEn = p_name OR 
                d.FullName = p_name OR 
                d.FullNameEn = p_name OR 
                d.CodeName = p_name
            ORDER BY 
                CASE 
                    WHEN d.Name = p_name THEN 1 
                    WHEN d.FullName = p_name THEN 2 
                    ELSE 3 
                END,
                d.Name ASC
            LIMIT p_limit;
        END;
    `);
}

async function dropSearchProductIDFromUIDProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS SearchProductIDFromUID;
    `);
}

async function createSearchProductIDFromUIDProcedure() {
    await pool.query(`
        CREATE PROCEDURE SearchProductIDFromUID(
            IN p_uid BIGINT UNSIGNED
        )
        BEGIN
            SELECT ProductID FROM Products WHERE UID = p_uid;
        END;
    `);
}

async function dropGetAllProvincesProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS GetAllProvinces;
    `);
}

async function createGetAllProvincesProcedure() {
    await pool.query(`
        CREATE PROCEDURE GetAllProvinces()
        BEGIN
            SELECT 
                ProvinceCode AS code,
                Name,
                NameEn,
                FullName,
                'province' AS type
            FROM Provinces;
        END;
    `);
}

async function dropGetAllDistrictsProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS GetAllDistricts;
    `);
}

async function createGetAllDistrictsProcedure() {
    await pool.query(`
        CREATE PROCEDURE GetAllDistricts()
        BEGIN
            SELECT 
                DistrictCode AS code,
                Name,
                NameEn,
                FullName,
                'district' AS type,
                ProvinceCode AS provinceCode
            FROM Districts;
        END;
    `);
}

async function dropRotateMonthPartitionsProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS RotateMonthPartitions;
    `);
}

async function createRotateMonthPartitionsProcedure(pool) {
    await pool.query(`
        CREATE PROCEDURE RotateMonthPartitions(
        IN in_schema VARCHAR(64),
        IN in_table  VARCHAR(64),
        IN keep_months INT
        )
        proc: BEGIN
            DECLARE v_schema VARCHAR(64);
            DECLARE v_table  VARCHAR(64);

            DECLARE v_today DATE;
            DECLARE v_month0 DATE;        -- ngày 1 của tháng hiện tại
            DECLARE v_is_first_day BOOLEAN;

            DECLARE v_has_pmax INT DEFAULT 0;

            DECLARE i INT DEFAULT 0;
            DECLARE v_part_name VARCHAR(16);
            DECLARE v_part_boundary DATE;

            DECLARE v_sql TEXT;

            -- Cursor xóa partition cũ (boundary < v_month0)
            DECLARE c_name VARCHAR(64);
            DECLARE done INT DEFAULT 0;
            DECLARE cur_old CURSOR FOR
                SELECT PARTITION_NAME
                FROM information_schema.PARTITIONS
                WHERE TABLE_SCHEMA = v_schema
                AND TABLE_NAME   = v_table
                AND PARTITION_NAME IS NOT NULL
                AND PARTITION_NAME <> 'pmax'
                AND PARTITION_DESCRIPTION REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                AND PARTITION_DESCRIPTION < DATE_FORMAT(v_month0, '%Y-%m-%d');
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

            -- Chuẩn hóa input
            SET v_schema = NULLIF(TRIM(in_schema), '');
            IF v_schema IS NULL THEN SET v_schema = DATABASE(); END IF;

            SET v_table = TRIM(in_table);
            IF v_table IS NULL OR v_table = '' THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Table name is required';
            END IF;

            IF keep_months IS NULL OR keep_months < 1 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'keep_months must be >= 1';
            END IF;

            -- Chỉ chạy đầu tháng
            SET v_today = CURRENT_DATE();
            SET v_month0 = DATE_SUB(v_today, INTERVAL DAY(v_today) - 1 DAY);
            SET v_is_first_day = (v_today = v_month0);
            /*IF NOT v_is_first_day THEN
                LEAVE proc;
            END IF;*/

            -- Phải có pmax
            SELECT COUNT(*) INTO v_has_pmax
            FROM information_schema.PARTITIONS
            WHERE TABLE_SCHEMA = v_schema
            AND TABLE_NAME   = v_table
            AND PARTITION_NAME = 'pmax';
            IF v_has_pmax = 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Missing partition pmax (MAXVALUE).';
            END IF;

            -- (1) Xóa tất cả partition cũ (boundary < ngày đầu tháng hiện tại)
            OPEN cur_old;
            old_loop: LOOP
                FETCH cur_old INTO c_name;
                IF done = 1 THEN LEAVE old_loop; END IF;

                SET v_sql = CONCAT(
                'ALTER TABLE ', v_schema, '.', v_table, ' DROP PARTITION ', c_name
                );
                SET @sql := v_sql;
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            END LOOP;
            CLOSE cur_old;

            -- (2) Bổ sung đủ các partition từ tháng hiện tại → hiện tại + (keep_months - 1)
            SET i = 0;
            ensure_loop: WHILE i < keep_months DO
                SET v_part_name = CONCAT('p', DATE_FORMAT(DATE_ADD(v_month0, INTERVAL i MONTH), '%Y_%m'));
                SET v_part_boundary = DATE_ADD(DATE_ADD(v_month0, INTERVAL i MONTH), INTERVAL 1 MONTH);

                IF NOT EXISTS (
                SELECT 1
                FROM information_schema.PARTITIONS
                WHERE TABLE_SCHEMA = v_schema
                    AND TABLE_NAME   = v_table
                    AND PARTITION_NAME = v_part_name
                ) THEN
                SET v_sql = CONCAT(
                    'ALTER TABLE ', v_schema, '.', v_table, ' ',
                    'REORGANIZE PARTITION pmax INTO (',
                    'PARTITION ', v_part_name, ' VALUES LESS THAN (''',
                    DATE_FORMAT(v_part_boundary, '%Y-%m-01'), '''), ',
                    'PARTITION pmax VALUES LESS THAN (MAXVALUE)',
                    ')'
                );
                SET @sql := v_sql;
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                END IF;

                SET i = i + 1;
            END WHILE;

        END
    `);
}

async function dropAddCalendarForRoomProcedureIfExists() {
    await pool.query(`
        DROP PROCEDURE IF EXISTS AddCalendarForRoom;
    `);
}

async function createAddCalendarForRoomProcedure() {
    await pool.query(`
        CREATE PROCEDURE \`AddCalendarForRoom\`(
        IN in_schema       VARCHAR(64),   -- NULL => DATABASE()
        IN in_product_id   INT,           -- NULL => tất cả Products
        IN in_months_ahead INT            -- số tháng (>=1)
        )
        BEGIN
            DECLARE v_months INT;
            DECLARE v_cur DATE;
            DECLARE v_end DATE;
            DECLARE v_total BIGINT DEFAULT 0;

            -- months >= 1
            SET v_months = IFNULL(in_months_ahead, 6);
            IF v_months < 1 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'in_months_ahead must be >= 1';
            END IF;

            -- [v_cur .. v_end) theo ngày
            SET v_cur = DATE_SUB(CURRENT_DATE(), INTERVAL DAY(CURRENT_DATE())-1 DAY);
            SET v_end = DATE_ADD(v_cur, INTERVAL v_months MONTH);

            day_loop: WHILE v_cur < v_end DO
                -- chỉ chèn (ProductID, v_cur) chưa tồn tại
                INSERT INTO Calendar (ProductID, Day, Status)
                SELECT p.ProductID, v_cur, 'available'
                FROM Products p
                LEFT JOIN Calendar c
                    ON c.ProductID = p.ProductID AND c.Day = v_cur
                WHERE c.ProductID IS NULL
                AND (in_product_id IS NULL OR p.ProductID = in_product_id);

                SET v_total = v_total + ROW_COUNT();

                SET v_cur = DATE_ADD(v_cur, INTERVAL 1 DAY);
            END WHILE;

            -- trả về số dòng đã thêm (optional)
            SELECT v_total AS inserted_rows;
        END
    `);
}

async function dropSpPlaceBookingDraftIfExists() {
    await pool.query(`DROP PROCEDURE IF EXISTS sp_place_booking_draft;`);
}

async function createSpPlaceBookingDraft() {
    await pool.query(`
        CREATE PROCEDURE sp_place_booking_draft (
            IN  p_UserID INT, IN  p_ProductID INT,
            IN  p_Start DATE, IN  p_End DATE,          -- [start, end)
            IN  p_Nights INT, IN  p_UnitPrice DECIMAL(10,2),
            IN  p_Currency VARCHAR(10), IN  p_Provider VARCHAR(50),
            IN  p_HoldMinutes INT,
            OUT p_BookingID INT UNSIGNED, OUT p_PaymentID BIGINT, OUT p_HoldExpiresAt DATETIME
        )
        proc:BEGIN
            DECLARE v_lock_ok INT DEFAULT 0; DECLARE v_now DATETIME;
            DECLARE v_amount DECIMAL(10,2); DECLARE v_conflicts INT DEFAULT 0;

            IF p_End <= p_Start THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='End>Start required'; END IF;
            SET v_now = NOW(); IF p_HoldMinutes IS NULL OR p_HoldMinutes<=0 THEN SET p_HoldMinutes=30; END IF;
            IF p_Nights IS NULL OR p_Nights<=0 THEN SET p_Nights = DATEDIFF(p_End, p_Start); END IF;
            SET v_amount = p_Nights * p_UnitPrice; SET p_HoldExpiresAt = v_now + INTERVAL p_HoldMinutes MINUTE;

            SELECT GET_LOCK(CONCAT('calprod:', p_ProductID), 10) INTO v_lock_ok;
            IF v_lock_ok <> 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Cannot obtain product lock'; END IF;

            START TRANSACTION;

            -- 0) Dọn reserved hết hạn
            UPDATE Calendar
            SET Status='available', LockReason=NULL, BookingID=NULL, AuctionID=NULL, HoldExpiresAt=NULL
            WHERE Status='reserved' AND HoldExpiresAt IS NOT NULL AND HoldExpiresAt < v_now;

            -- 1) Booking pending
            INSERT INTO Booking(UserID, ProductID, StartDate, EndDate, BookingStatus, WinningPrice, CreatedAt, UpdatedAt)
            VALUES(p_UserID, p_ProductID, p_Start, p_End, 'pending', v_amount, v_now, v_now);
            SET p_BookingID = LAST_INSERT_ID();

            -- 2) Kiểm tra xung đột
            SELECT COUNT(*) INTO v_conflicts
            FROM Calendar
            WHERE ProductID=p_ProductID AND Day>=p_Start AND Day<p_End
            AND ( Status IN ('booked','blocked')
                OR (Status='reserved' AND (HoldExpiresAt IS NULL OR HoldExpiresAt >= v_now)) );
            IF v_conflicts>0 THEN
                ROLLBACK; DO RELEASE_LOCK(CONCAT('calprod:', p_ProductID));
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Date range not available';
            END IF;

            -- 3a) Bơm dòng thiếu (CTE đứng trước INSERT)
            INSERT IGNORE INTO Calendar(ProductID, Day, Status)
            WITH RECURSIVE d AS (
                SELECT p_Start AS Day
                UNION ALL
                SELECT Day + INTERVAL 1 DAY FROM d WHERE Day + INTERVAL 1 DAY < p_End
            )
            SELECT p_ProductID, Day, 'available' FROM d;

            -- 3b) Reserve dải ngày (CTE đứng trước UPDATE, rồi JOIN trực tiếp d2)
            WITH RECURSIVE d2 AS (
                SELECT p_Start AS Day
                UNION ALL
                SELECT Day + INTERVAL 1 DAY FROM d2 WHERE Day + INTERVAL 1 DAY < p_End
            )
            UPDATE Calendar c
            JOIN d2 x ON x.Day = c.Day
            SET c.Status='reserved',
                c.LockReason='booking_hold',
                c.BookingID=p_BookingID,
                c.AuctionID=NULL,
                c.HoldExpiresAt=p_HoldExpiresAt
            WHERE c.ProductID=p_ProductID AND c.Day>=p_Start AND c.Day<p_End;

            -- 4) Payment initiated
            /*INSERT INTO Payments(BookingID, UserID, Amount, Currency, Provider, Status, CreatedAt, UpdatedAt)
            VALUES(p_BookingID, p_UserID, v_amount, p_Currency, p_Provider, 'initiated', v_now, v_now);
            SET p_PaymentID = LAST_INSERT_ID();*/

            COMMIT; DO RELEASE_LOCK(CONCAT('calprod:', p_ProductID));
        END
    `);
}




async function initSchema() {
    try {
        await testConnection();
        console.log('✅ Database connection established successfully!');
        
        console.log('\n📋 Creating tables...');

        await createSystemParametersTable();
        console.log('✅ SystemParameters table ready');

        await createAdministrativeRegionsTable();
        console.log('✅ AdministrativeRegions table ready');
        
        await createAdministrativeUnitsTable();
        console.log('✅ AdministrativeUnits table ready');
        
        await createProvincesTable();
        console.log('✅ Provinces table ready');
        
        await createDistrictsTable();
        console.log('✅ Districts table ready');
        
        await createUsersTable();
        console.log('✅ Users table ready');
        
        await createOAuthAccountsTable();
        console.log('✅ OAuthAccounts table ready');
        
        await createPaymentMethodsTable();
        console.log('✅ PaymentMethods table ready');
        
        await createPropertiesTable();
        console.log('✅ Properties table ready');
        
        await createRoomTypesTable();
        console.log('✅ RoomTypes table ready');
        
        await createProductsTable();
        console.log('✅ Products table ready');

        await createFavoritesTable();
        console.log('✅ Favorites table ready');

        await createWishlistTable();
        console.log('✅ Wishlist table ready');

        await createAmenityGroupsTable();
        console.log('✅ AmenityGroups table ready');
        
        await createAmenitiesTable();
        console.log('✅ Amenities table ready');
        
        await createProductAmenitiesTable();
        console.log('✅ ProductAmenities table ready');
        
        await createAuctionTable();
        console.log('✅ Auction table ready');
        
        await createBidsTable();
        console.log('✅ Bids table ready');
        
        await createBookingTable();
        console.log('✅ Booking table ready');

        await createCalendarTable();
        console.log('✅ Calendar table ready');

        await createPaymentsTable();
        console.log('✅ Payments table ready');

        await createUserViolationsTable();
        console.log('✅ UserViolations table ready');

        await createEmailOutboxTable();
        console.log('✅ EmailOutbox table ready');
        
        await createRatingTable();
        console.log('✅ Rating table ready');

        console.log('\n📋 Creating triggers...');

        await dropUpdateRoomTypesTriggerIfExists();
        await createUpdateRoomTypesTrigger();
        console.log('✅ UpdateRoomTypes trigger ready');

        console.log('\n📋 Creating procedures...');

        await dropUpsertPropertyProcedureIfExists();
        await createUpsertPropertyProcedure();
        console.log('✅ UpsertProperty procedure ready');

        await dropUpsertRoomTypeProcedureIfExists();
        await createUpsertRoomTypeProcedure();
        console.log('✅ UpsertRoomType procedure ready');

        await dropUpsertProductProcedureIfExists();
        await createUpsertProductProcedure();
        console.log('✅ UpsertProduct procedure ready');

        await dropAddToFavoritesProcedureIfExists();
        await createAddToFavoritesProcedure();
        console.log('✅ AddToFavorites procedure ready');

        await dropRemoveFromFavoritesProcedureIfExists();
        await createRemoveFromFavoritesProcedure();
        console.log('✅ RemoveFromFavorites procedure ready');

        await dropGetUserFavoritesProcedureIfExists();
        await createGetUserFavoritesProcedure();
        console.log('✅ GetUserFavorites procedure ready');

        await dropUpsertAmenityGroupProcedureIfExists();
        await createUpsertAmenityGroupProcedure();
        console.log('✅ UpsertAmenityGroup procedure ready');

        await dropUpsertAmenityProcedureIfExists();
        await createUpsertAmenityProcedure();
        console.log('✅ UpsertAmenity procedure ready');

        await dropUpsertProductAmenityProcedureIfExists();
        await createUpsertProductAmenityProcedure();
        console.log('✅ UpsertProductAmenity procedure ready');

        await dropUpsertRatingProcedureIfExists();
        await createUpsertRatingProcedure();
        console.log('✅ UpsertRating procedure ready');

        await dropGetTopProductsByProvinceProcedureIfExists();
        await createGetTopProductsByProvinceProcedure();
        console.log('✅ GetTopProductsByProvince procedure ready');

        await dropGetTopProductsByDistrictProcedureIfExists();
        await createGetTopProductsByDistrictProcedure();
        console.log('✅ GetTopProductsByDistrict procedure ready');

        await dropGetPopularProvincesProcedureIfExists();
        await createGetPopularProvincesProcedure();
        console.log('✅ GetPopularProvinces procedure ready');

        await dropGetPopularDistrictsProcedureIfExists();
        await createGetPopularDistrictsProcedure();
        console.log('✅ GetPopularDistricts procedure ready');

        await dropSearchProvincesProcedureIfExists();
        await createSearchProvincesProcedure();
        console.log('✅ SearchProvinces procedure ready');

        await dropSearchDistrictsProcedureIfExists();
        await createSearchDistrictsProcedure();
        console.log('✅ SearchDistricts procedure ready');

        await dropSearchProductIDFromUIDProcedureIfExists();
        await createSearchProductIDFromUIDProcedure();
        console.log('✅ SearchProductIDFromUID procedure ready');

        await dropGetAllProvincesProcedureIfExists();
        await createGetAllProvincesProcedure();
        console.log('✅ GetAllProvinces procedure ready');

        await dropGetAllDistrictsProcedureIfExists();
        await createGetAllDistrictsProcedure();
        console.log('✅ GetAllDistricts procedure ready');

        await dropRotateMonthPartitionsProcedureIfExists();
        await createRotateMonthPartitionsProcedure(pool);
        console.log('✅ RotateMonthPartitions procedure ready');

        await pool.execute('CALL RotateMonthPartitions(NULL, ?, ?)', ['Calendar', 12]);
        console.log('✅ Initial partition rotation for Calendar table completed');

        await dropAddCalendarForRoomProcedureIfExists();
        await createAddCalendarForRoomProcedure();
        console.log('✅ AddCalendarForRoom procedure ready');

        await dropSpPlaceBookingDraftIfExists();
        await createSpPlaceBookingDraft();
        console.log('✅ sp_place_booking_draft procedure ready');

        console.log('\n🎉 Database schema initialization completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Error during database schema initialization:', error);
        throw error;
    }
}

initSchema();

module.exports = pool;