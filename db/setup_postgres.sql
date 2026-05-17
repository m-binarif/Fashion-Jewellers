CREATE TABLE category (
    category_id   VARCHAR(10)  NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (category_id),
    UNIQUE (category_name)
);

CREATE TABLE material (
    material_id VARCHAR(10)  NOT NULL,
    material    VARCHAR(100) NOT NULL,
    PRIMARY KEY (material_id),
    UNIQUE (material)
);

CREATE TABLE type (
    type_id   VARCHAR(10)  NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (type_id),
    UNIQUE (type_name)
);

CREATE TABLE role_type (
    role_id      VARCHAR(10) NOT NULL,
    role_name    VARCHAR(50) NOT NULL,
    basic_salary INTEGER,
    PRIMARY KEY (role_id),
    UNIQUE (role_name),
    CHECK (basic_salary > 0)
);

CREATE TABLE payment_method (
    method_id    VARCHAR(10) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    PRIMARY KEY (method_id),
    UNIQUE (payment_type)
);

CREATE TABLE customer (
    customer_id   VARCHAR(10)  NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL,
    country       VARCHAR(50)  NOT NULL,
    phone_number  VARCHAR(20)  NOT NULL,
    address       VARCHAR(255) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL,
    is_active     SMALLINT     NOT NULL DEFAULT 1,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id),
    UNIQUE (email)
);

CREATE TABLE supplier (
    supplier_id   VARCHAR(10)  NOT NULL,
    supplier_name VARCHAR(100) NOT NULL,
    supplier_type VARCHAR(50),
    email         VARCHAR(100),
    phone_number  VARCHAR(20)  NOT NULL,
    is_active     SMALLINT     NOT NULL DEFAULT 1,
    PRIMARY KEY (supplier_id),
    UNIQUE (email),
    UNIQUE (phone_number)
);

CREATE TABLE employee (
    employee_id  VARCHAR(10)  NOT NULL,
    emp_name     VARCHAR(100) NOT NULL,
    email        VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20)  NOT NULL,
    hire_date    DATE,
    cnic         VARCHAR(15)  NOT NULL,
    username     VARCHAR(50)  NOT NULL,
    password     VARCHAR(255) NOT NULL,
    increment    INTEGER,
    role_id      VARCHAR(10)  NOT NULL,
    is_active    SMALLINT     NOT NULL DEFAULT 1,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (employee_id),
    UNIQUE (email),
    UNIQUE (cnic),
    UNIQUE (username),
    CONSTRAINT fk_employee_role FOREIGN KEY (role_id) REFERENCES role_type (role_id)
);

CREATE TABLE product (
    product_id        VARCHAR(10)   NOT NULL,
    product_name      VARCHAR(255)  NOT NULL,
    description       TEXT,
    base_price        DECIMAL(10,2) NOT NULL,
    quantity          INT           NOT NULL DEFAULT 0,
    is_active         SMALLINT      NOT NULL DEFAULT 1,
    last_stock_update TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    origin            VARCHAR(50),
    weight            VARCHAR(20),
    image_url         TEXT,
    category_id       VARCHAR(10)   NOT NULL,
    material_id       VARCHAR(10)   NOT NULL,
    type_id           VARCHAR(10)   NOT NULL,
    supplier_id       VARCHAR(10)   NOT NULL,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id),
    CHECK (base_price > 0),
    CHECK (quantity >= 0),
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES category (category_id),
    CONSTRAINT fk_product_material FOREIGN KEY (material_id) REFERENCES material (material_id),
    CONSTRAINT fk_product_type     FOREIGN KEY (type_id)     REFERENCES type  (type_id),
    CONSTRAINT fk_product_supplier FOREIGN KEY (supplier_id) REFERENCES supplier (supplier_id)
);

-- ============================================================
-- CART
-- ============================================================

CREATE TABLE cart (
    cart_id     VARCHAR(10) NOT NULL,
    customer_id VARCHAR(10) NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (cart_id),
    UNIQUE (customer_id),
    CONSTRAINT fk_cart_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id) ON DELETE CASCADE
);

CREATE TABLE holds (
    cart_id      VARCHAR(10) NOT NULL,
    product_id   VARCHAR(10) NOT NULL,
    cart_item_id VARCHAR(10) NOT NULL,
    quantity     INTEGER     NOT NULL DEFAULT 1,
    PRIMARY KEY (cart_id, product_id),
    CHECK (quantity > 0),
    CONSTRAINT fk_holds_cart    FOREIGN KEY (cart_id)    REFERENCES cart    (cart_id)    ON DELETE CASCADE,
    CONSTRAINT fk_holds_product FOREIGN KEY (product_id) REFERENCES product (product_id)
);

CREATE TABLE orders (
    order_id             VARCHAR(10)   NOT NULL,
    order_number         VARCHAR(20)   NOT NULL,
    order_date           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount         DECIMAL(10,2),
    order_status         VARCHAR(20),
    customer_id          VARCHAR(10)   NOT NULL,
    shipping_street      VARCHAR(255),
    shipping_city        VARCHAR(100),
    shipping_state       VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    shipping_country     VARCHAR(50),
    status_updated_at    TIMESTAMP,
    created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id),
    UNIQUE (order_number),
    CHECK (total_amount > 0),
    CHECK (order_status IN ('Pending','Processing','Shipped','Delivered','Cancelled','Payment Failed')),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id)
);

CREATE TABLE record_items (
    order_id   VARCHAR(10)   NOT NULL,
    product_id VARCHAR(10)   NOT NULL,
    quantity   INTEGER       NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id),
    CHECK (quantity > 0),
    CONSTRAINT fk_record_order   FOREIGN KEY (order_id)   REFERENCES orders  (order_id)   ON DELETE CASCADE,
    CONSTRAINT fk_record_product FOREIGN KEY (product_id) REFERENCES product (product_id)
);

CREATE TABLE payment (
    payment_id     VARCHAR(10)   NOT NULL,
    payment_date   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount_paid    DECIMAL(15,2),
    currency_code  VARCHAR(3)    NOT NULL DEFAULT 'PKR',
    payment_status VARCHAR(20),
    order_id       VARCHAR(10)   NOT NULL,
    method_id      VARCHAR(10)   NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (payment_id),
    CHECK (amount_paid >= 0.01),
    CHECK (payment_status IN ('Pending','Completed','Failed')),
    CONSTRAINT fk_payment_order  FOREIGN KEY (order_id)  REFERENCES orders         (order_id),
    CONSTRAINT fk_payment_method FOREIGN KEY (method_id) REFERENCES payment_method (method_id)
);

CREATE TABLE shipment (
    shipment_id     VARCHAR(10)  NOT NULL,
    status          VARCHAR(20),
    delivery_date   DATE,
    tracking_number VARCHAR(50),
    carrier_name    VARCHAR(100),
    order_id        VARCHAR(10)  NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (shipment_id),
    UNIQUE (order_id),
    CHECK (status IN ('Packing','In Transit','Completed')),
    CONSTRAINT fk_shipment_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE
);

CREATE TABLE review (
    review_id   VARCHAR(10)  NOT NULL,
    rating      INTEGER,
    comment     VARCHAR(300),
    review_date DATE         NOT NULL DEFAULT CURRENT_DATE,
    customer_id VARCHAR(10)  NOT NULL,
    product_id  VARCHAR(10)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (review_id),
    CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_review_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id),
    CONSTRAINT fk_review_product  FOREIGN KEY (product_id)  REFERENCES product  (product_id)
);

INSERT INTO payment_method (method_id, payment_type) VALUES
  ('PM001','Credit Card'),('PM002','Bank Transfer'),('PM003','Cash on Delivery'),('PM004','JazzCash');

INSERT INTO category (category_id, category_name) VALUES
  ('CAT001','Rings'),('CAT002','Necklaces'),('CAT003','Bracelets'),('CAT004','Earrings'),('CAT005','Sets');
  
INSERT INTO material (material_id, material) VALUES
  ('MAT001','Gold Plated'),('MAT002','Artificial'),('MAT003','Gold-Silver'),('MAT004','Zircon Work'),('MAT005','Hand-work');

INSERT INTO type (type_id, type_name) VALUES
  ('TYP001','Wedding'),('TYP002','Party'),('TYP003','Casual'),('TYP004','Luxury');

INSERT INTO role_type (role_id, role_name, basic_salary) VALUES
  ('ROL001','Store Manager',80000),('ROL002','Sales Executive',60000),('ROL003','Warehouse Manager',40000);

INSERT INTO employee (employee_id,emp_name,email,phone_number,hire_date,cnic,username,password,increment,role_id,is_active) VALUES
  ('EMP001','Mohsin Raza','mohsin@jewellery.com','923218999514','2023-01-01','3520112345671','ahmad','$2b$12$ArJwVJYWmQsFUOYHzgqdmOyanWoyDy5.hj.fvg34SEzwC44F8nQnS',5000,'ROL001',1),
  ('EMP002','Abid khan','abidkk@jewellery.com','9232343249123','2023-03-15','3984827654328','abid','$2b$12$ArJwVJYWmQsFUOYHzgqdmOyanWoyDy5.hj.fvg34SEzwC44F8nQnS',3000,'ROL002',1),
  ('EMP003','Zara Sheikh','zara@jewellery.com','9231238127312','2023-05-20','3201569913423','zara','$2b$12$ArJwVJYWmQsFUOYHzgqdmOyanWoyDy5.hj.fvg34SEzwC44F8nQnS',6000,'ROL003',1),
  ('EMP004','M. Touqeer ','touqeer@jewellery.com','9234213213214','2023-05-20','3512345322341','touqeer','$2b$12$ArJwVJYWmQsFUOYHzgqdmOyanWoyDy5.hj.fvg34SEzwC44F8nQnS',7000,'ROL003',1);

INSERT INTO customer (customer_id,full_name,email,country,phone_number,address,password_hash,is_active) VALUES
  ('C001','Ayesha Khan','ayesha.khan@email.com','Pakistan','+923331234567','House 45, Street 12, DHA Phase 5, Lahore','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C002','Fatima Ali','fatima.ali99@yahoo.com','Pakistan','+923339876543','Flat 3B, Sea View Apartments, Clifton, Karachi','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C003','Bilal Ahmed','bilal.ahmed.tech@hotmail.com','Pakistan','+923335551234','Plot 12, Sector F-8/4, Islamabad','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C004','Zara Sheikh','zara.shk@gmail.com','Pakistan','+923335551234','Bangalow 19, Cantonment Board, Peshawar','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C005','Maham Tariq','maham_t@gmail.com','Pakistan','+923335551234','House 8, Block 13-D, Gulshan-e-Iqbal, Karachi','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C006','Hira Malik','malik.hira@outlook.com','Pakistan','+923335551234','House 55, Street 2, Bahria Town, Rawalpindi','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C007','Sana Javed','sana.j.design@gmail.com','Pakistan','+923335551234','Apt 4C, Askari 11, Lahore, Rawalpindi','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C008','Usman Raza','uraza88@gmail.com','Pakistan','+923335551234','House 12, Street 5, Model Town, Multan','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C009','Nida Yasir','nida.yasir.official@yahoo.com','Pakistan','+923335551234','Villa 9, DHA Phase 6, Karachi','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C010','Saad Qureshi','saadq_business@gmail.com','Pakistan','+923335551234','House 34, Sector G-10/2, Islamabad','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C011','Zainab Abbas','zainab.ab@hotmail.com','Pakistan','+923335551234','Flat 12A, Liberty Gulberg, Lahore','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C012','Maryam Nawaz','maryam.nawaz92@gmail.com','Pakistan','+923335551234','House 77, Street 1, Hayatabad, Peshawar','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C013','Fahad Mustafa','fahadm_actor@gmail.com','Pakistan','+923335551234','House 22, Block 4, Clifton, Karachi','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C014','Iqra Aziz','iqra.aziz.style@yahoo.com','Pakistan','+923335551234','Plot 5, Sector F-11/1, Islamabad','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('C015','Aliya Hassan','aliya.hasan85@gmail.com','Pakistan','+923335551234','House 101, Wapda Town, Lahore','$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1);

INSERT INTO supplier (supplier_id, supplier_name, supplier_type, email, phone_number, is_active) VALUES
  ('SUP001', 'Golden Gems Co.', 'Gold Plated Items', 'contact@goldengems.com', '+923001234567', 1),
  ('SUP002', 'Silver Craft Ltd.', 'Silver Wholesaler', 'info@silvercraft.com', '+923009876543', 1),
  ('SUP003', 'Diamond Palace Inc.', 'Importer', 'sales@diamondpalace.com', '+923005551234', 1),
  ('SUP004', 'Zaveri Artificials', 'Artificial Jewelry', 'sinfo@zaveri.pk', '+923002835749', 1),
  ('SUP005', 'Multan Meenakari Arts', 'Handicraft & Meenakari', 'arts@multanmeena.pk', '+9230234624629', 1);

INSERT INTO product (product_id, product_name, description, base_price, quantity, is_active, origin, weight, image_url, category_id, material_id, type_id, supplier_id) VALUES
  ('P001', 'The Laurel Collection Set', 'Diamond Cluster Leaf-Inspired Special Occasion Set', 11000.00, 25, 1, 'local', '18g', '/uploads/the_laurel_collection_set.png', 'CAT005', 'MAT001', 'TYP001', 'SUP003'),
  ('P002', 'The Eternal Bloom Pearl Set', 'Rhodium-plated Alloy / Pearl / Zircon', 13500.00, 10, 1, 'local', '30g', '/uploads/the_eternal_bloom_pearl_set.png', 'CAT005', 'MAT004', 'TYP004', 'SUP002'),
  ('P003', 'Midnight Flora Lattice Bangle', 'Striking contrast of faceted rectangular black stones and intricate overlay of clear stone floral clusters', 3700.00, 50, 1, 'China', '7g', '/uploads/midnight_flora_lattice_bangle.png', 'CAT003', 'MAT004', 'TYP003', 'SUP002'),
  ('P004', 'Ruby Flora', 'A premium rose gold bangle featuring an intricate floral motif', 4100.00, 5, 1, 'China', '8g', '/uploads/ruby_flora.png', 'CAT003', 'MAT004', 'TYP002', 'SUP001'),
  ('P005', 'Pastel Pink Statement Earrings', 'Gold-Plated Pink stone Zircon earrings', 5000.00, 30, 1, 'Indian', '4g', '/uploads/pastel_pink_statement_earrings.png', 'CAT004', 'MAT001', 'TYP002', 'SUP001'),
  ('P006', 'Feather Gold Cuff', 'Minimalist gold cuff with a delicate feather design', 4500.00, 8, 1, 'local', '5g', '/uploads/feather_gold_cuff.png', 'CAT003', 'MAT001', 'TYP003', 'SUP001'),
  ('P007', 'Midnight Rose Floral Drop Earrings', 'Elegant drop earrings featuring midnight rose motifs', 7500.00, 40, 1, 'local', '12g', '/uploads/midnight_rose_floral_drop_earrings.png', 'CAT004', 'MAT004', 'TYP002', 'SUP004'),
  ('P008', 'Ruby Bangels', 'Traditional ruby bangles with gold plating', 3200.00, 15, 1, 'local', '10g', '/uploads/ruby_bangels.png', 'CAT003', 'MAT001', 'TYP001', 'SUP001'),
  ('P009', 'Spectra Radiant Bouquet Set', 'A radiant jewelry set inspired by floral bouquets', 2800.00, 60, 1, 'local', '3g', '/uploads/spectra_radiant_bouquet_set.png', 'CAT005', 'MAT004', 'TYP004', 'SUP004'),
  ('P010', 'The Imperial Emerald & Diamond Suite', 'Luxury emerald and diamond suite for grand occasions', 25000.00, 20, 1, 'local', '45g', '/uploads/the_imperial_emerald_&_diamond_suite.png', 'CAT005', 'MAT004', 'TYP004', 'SUP003');

INSERT INTO review (review_id, rating, comment, review_date, customer_id, product_id) VALUES
('REV001', 5, 'Absolutely loved the Laurel Collection Set! The diamond cluster leaf design is stunning.', '2026-04-12', 'C001', 'P001'),
('REV002', 4, 'The Eternal Bloom Pearl Set is beautiful and the rhodium plating looks very premium.', '2026-04-15', 'C002', 'P002'),
('REV003', 5, 'Very elegant Midnight Flora Lattice Bangle. The black stones look amazing.', '2026-03-28', 'C006', 'P003'),
('REV004', 3, 'The Spectra Radiant Bouquet Set is nice, but the size is smaller than expected.', '2026-04-05', 'C007', 'P009'),
('REV005', 5, 'Stunning Ruby Flora bangle! The rose gold finish and floral motif are perfect.', '2026-04-18', 'C008', 'P004'),
('REV006', 4, 'Good quality Pastel Pink Statement Earrings, the gold-plating is very shiny.', '2026-04-20', 'C011', 'P005'),
('REV007', 5, 'Loved the Ruby Bangles! The traditional look is exactly what I wanted for the wedding.', '2026-04-21', 'C014', 'P008'),
('REV008', 2, 'Received the Midnight Rose Drop Earrings with a tangled hook. Disappointed with packaging.', '2026-04-08', 'C004', 'P007'),
('REV009', 5, 'Amazing finishing on the Laurel Collection diamond set. Highly recommended!', '2026-04-19', 'C010', 'P001'),
('REV010', 4, 'The Eternal Bloom set is beautiful, the pearl quality is top-notch.', '2026-04-11', 'C001', 'P002'),
('REV011', 5, 'Bought this Feather Gold Cuff for my daily wear, very minimalist and chic.', '2026-04-14', 'C015', 'P006'),
('REV012', 5, 'The Imperial Emerald & Diamond Suite looks so premium and luxury. Worth the price!', '2026-03-22', 'C012', 'P010'),
('REV013', 4, 'Nice Midnight Flora Bangle, the contrast of black stones is very unique.', '2026-04-16', 'C005', 'P003'),
('REV014', 5, 'Heavy Imperial Emerald suite, exactly as shown in the pictures. Love it.', '2026-04-22', 'C003', 'P010'),
('REV015', 3, 'The Pastel Pink earrings are nice, but the color is slightly different from the photo.', '2026-04-10', 'C009', 'P005');


CREATE SEQUENCE IF NOT EXISTS category_id_seq START WITH 6;
ALTER TABLE category ALTER COLUMN category_id SET DEFAULT ('CAT' || LPAD(nextval('category_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS material_id_seq START WITH 6;
ALTER TABLE material ALTER COLUMN material_id SET DEFAULT ('MAT' || LPAD(nextval('material_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS type_id_seq START WITH 5;
ALTER TABLE type ALTER COLUMN type_id SET DEFAULT ('TYP' || LPAD(nextval('type_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS role_id_seq START WITH 4;
ALTER TABLE role_type ALTER COLUMN role_id SET DEFAULT ('ROL' || LPAD(nextval('role_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS method_id_seq START WITH 5;
ALTER TABLE payment_method ALTER COLUMN method_id SET DEFAULT ('PM' || LPAD(nextval('method_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS customer_id_seq START WITH 16;
ALTER TABLE customer ALTER COLUMN customer_id SET DEFAULT ('C' || LPAD(nextval('customer_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS supplier_id_seq START WITH 6;
ALTER TABLE supplier ALTER COLUMN supplier_id SET DEFAULT ('SUP' || LPAD(nextval('supplier_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS employee_id_seq START WITH 5;
ALTER TABLE employee ALTER COLUMN employee_id SET DEFAULT ('EMP' || LPAD(nextval('employee_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS product_id_seq START WITH 11;
ALTER TABLE product ALTER COLUMN product_id SET DEFAULT ('P' || LPAD(nextval('product_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS cart_id_seq START WITH 1;
ALTER TABLE cart ALTER COLUMN cart_id SET DEFAULT ('CRT' || LPAD(nextval('cart_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS cart_item_id_seq START WITH 1;
ALTER TABLE holds ALTER COLUMN cart_item_id SET DEFAULT ('CI' || LPAD(nextval('cart_item_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS order_id_seq START WITH 1;
ALTER TABLE orders ALTER COLUMN order_id SET DEFAULT ('O' || LPAD(nextval('order_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS order_detail_id_seq START WITH 1;
ALTER TABLE record_items ADD COLUMN IF NOT EXISTS order_detail_id VARCHAR(10);
ALTER TABLE record_items ALTER COLUMN order_detail_id SET DEFAULT ('OD' || LPAD(nextval('order_detail_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS payment_id_seq START WITH 1;
ALTER TABLE payment ALTER COLUMN payment_id SET DEFAULT ('PAY' || LPAD(nextval('payment_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS shipment_id_seq START WITH 1;
ALTER TABLE shipment ALTER COLUMN shipment_id SET DEFAULT ('SHP' || LPAD(nextval('shipment_id_seq')::text, 3, '0'));

CREATE SEQUENCE IF NOT EXISTS review_id_seq START WITH 16;
ALTER TABLE review ALTER COLUMN review_id SET DEFAULT ('REV' || LPAD(nextval('review_id_seq')::text, 3, '0'));

