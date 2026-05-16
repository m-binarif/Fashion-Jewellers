
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

-- ============================================================
-- USERS
-- ============================================================

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
    UNIQUE (email),
    UNIQUE (phone_number)
);

CREATE TABLE supplier (
    supplier_id   VARCHAR(10)  NOT NULL,
    supplier_name VARCHAR(100) NOT NULL,
    supplier_type VARCHAR(50),
    email         VARCHAR(100),
    phone_number  VARCHAR(20)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active     SMALLINT     NOT NULL DEFAULT 1,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (supplier_id),
    UNIQUE (email),
    UNIQUE (phone_number)
);

-- Admin credentials are stored in environment variables (.env),
-- not in the database. This avoids a single-row table.

CREATE TABLE employee (
    employee_id VARCHAR(10)  NOT NULL,
    emp_name    VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL,
    hire_date   DATE,
    cnic        VARCHAR(15)  NOT NULL,
    username    VARCHAR(50)  NOT NULL,
    password    VARCHAR(255) NOT NULL,
    increment   INTEGER,
    role_id     VARCHAR(10)  NOT NULL,
    is_active   SMALLINT     NOT NULL DEFAULT 1,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (employee_id),
    UNIQUE (email),
    UNIQUE (cnic),
    UNIQUE (username),
    CONSTRAINT fk_employee_role FOREIGN KEY (role_id) REFERENCES role_type (role_id)
);

CREATE TABLE emp_contacts (
    phone_number VARCHAR(20) NOT NULL,
    employee_id  VARCHAR(10),
    PRIMARY KEY (phone_number),
    CONSTRAINT fk_contacts_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id) ON DELETE CASCADE
);

-- ============================================================
-- CATALOGUE
-- ============================================================

CREATE TABLE product (
    product_id     VARCHAR(10)   NOT NULL,
    product_name   VARCHAR(255)  NOT NULL,
    description    TEXT,
    base_price     DECIMAL(10,2) NOT NULL,
    origin         VARCHAR(50),
    weight         VARCHAR(20),
    category_id    VARCHAR(10)   NOT NULL,
    material_id    VARCHAR(10)   NOT NULL,
    type_id        VARCHAR(10)   NOT NULL,
    is_active      SMALLINT      NOT NULL DEFAULT 1,
    is_featured    SMALLINT      NOT NULL DEFAULT 0,
    stock_quantity INT           NOT NULL DEFAULT 0,
    image_url      TEXT,
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id),
    CHECK (base_price > 0),
    CHECK (stock_quantity >= 0),
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES category (category_id),
    CONSTRAINT fk_product_material FOREIGN KEY (material_id) REFERENCES material (material_id),
    CONSTRAINT fk_product_type     FOREIGN KEY (type_id)     REFERENCES type  (type_id)
);

CREATE TABLE design (
    design_id    VARCHAR(10)  NOT NULL,
    design_name  VARCHAR(100) NOT NULL,
    style        VARCHAR(50),
    color        VARCHAR(50),
    stone_type   VARCHAR(50),
    plating_type VARCHAR(50),
    description  VARCHAR(200),
    making_style VARCHAR(50),
    product_id   VARCHAR(10)  NOT NULL,
    PRIMARY KEY (design_id),
    CONSTRAINT fk_design_product FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE
);

CREATE TABLE inventory (
    inventory_id      VARCHAR(10) NOT NULL,
    product_quantity  INTEGER,
    last_stock_update DATE        NOT NULL DEFAULT CURRENT_DATE,
    product_id        VARCHAR(10) NOT NULL,
    created_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (inventory_id),
    UNIQUE (product_id),
    CHECK (product_quantity >= 0),
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES product (product_id) ON DELETE CASCADE
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
    cart_item_id VARCHAR(10),
    quantity     INTEGER,
    PRIMARY KEY (cart_id, product_id),
    CHECK (quantity > 0),
    CONSTRAINT fk_holds_cart    FOREIGN KEY (cart_id)    REFERENCES cart    (cart_id)    ON DELETE CASCADE,
    CONSTRAINT fk_holds_product FOREIGN KEY (product_id) REFERENCES product (product_id)
);

-- ============================================================
-- ORDERS
-- ============================================================

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
    order_id        VARCHAR(10)   NOT NULL,
    product_id      VARCHAR(10)   NOT NULL,
    order_detail_id VARCHAR(10),
    quantity        INTEGER,
    unit_price      DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id),
    CHECK (quantity > 0),
    CONSTRAINT fk_record_order   FOREIGN KEY (order_id)   REFERENCES orders  (order_id)   ON DELETE CASCADE,
    CONSTRAINT fk_record_product FOREIGN KEY (product_id) REFERENCES product (product_id)
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payment (
    payment_id     VARCHAR(10)   NOT NULL,
    payment_date   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount_paid    DECIMAL(15,2),
    currency_code  VARCHAR(3)    NOT NULL DEFAULT 'USD',
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

-- ============================================================
-- SHIPMENTS
-- ============================================================

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

-- ============================================================
-- SUPPLIER / PURCHASING
-- ============================================================

CREATE TABLE purchase (
    purchase_id      VARCHAR(10)  NOT NULL,
    date_of_purchase DATE         NOT NULL DEFAULT CURRENT_DATE,
    stock_details    VARCHAR(200),
    supplier_id      VARCHAR(10)  NOT NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (purchase_id),
    CONSTRAINT fk_purchase_supplier FOREIGN KEY (supplier_id) REFERENCES supplier (supplier_id)
);

CREATE TABLE acquires (
    purchase_id VARCHAR(10)   NOT NULL,
    product_id  VARCHAR(10)   NOT NULL,
    quantity    INTEGER,
    cost_price  DECIMAL(10,2),
    PRIMARY KEY (purchase_id, product_id),
    CONSTRAINT fk_acquires_purchase FOREIGN KEY (purchase_id) REFERENCES purchase (purchase_id) ON DELETE CASCADE,
    CONSTRAINT fk_acquires_product  FOREIGN KEY (product_id)  REFERENCES product  (product_id)  ON DELETE CASCADE
);

-- ============================================================
-- REVIEWS
-- ============================================================

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

-- ============================================================
-- SUPPLIER STOCK LOGS
-- ============================================================

CREATE TABLE supplier_stock_logs (
    log_id      SERIAL      PRIMARY KEY,
    supplier_id VARCHAR(10) NOT NULL,
    product_id  VARCHAR(10) NOT NULL,
    new_quantity INT        NOT NULL,
    updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stocklog_supplier FOREIGN KEY (supplier_id) REFERENCES supplier (supplier_id),
    CONSTRAINT fk_stocklog_product  FOREIGN KEY (product_id)  REFERENCES product  (product_id)
);

-- ============================================================
-- SUPPLIER MATERIALS
-- ============================================================

CREATE TABLE supplier_materials (
    sm_id           VARCHAR(10)   NOT NULL,
    supplier_id     VARCHAR(10)   NOT NULL,
    material_id     VARCHAR(10)   NOT NULL,
    quantity        DECIMAL(15,2) NOT NULL,
    unit_of_measure VARCHAR(50)   NOT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sm_id),
    UNIQUE (supplier_id, material_id),
    CHECK (quantity > 0),
    CONSTRAINT fk_sm_supplier FOREIGN KEY (supplier_id) REFERENCES supplier (supplier_id),
    CONSTRAINT fk_sm_material FOREIGN KEY (material_id) REFERENCES material (material_id)
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO payment_method (method_id, payment_type) VALUES
  ('PM001','Credit Card'),('PM002','Bank Transfer'),('PM003','Cash on Delivery'),('PM004','JazzCash');

INSERT INTO category (category_id, category_name) VALUES
  ('CAT001','Rings'),('CAT002','Necklaces'),('CAT003','Bracelets'),('CAT004','Earrings'),('CAT005','Set');
  
INSERT INTO material (material_id, material) VALUES
  ('MAT001','Gold plated'),('MAT002','Artificial'),('MAT003','gold-Silver'),('MAT004','Zircon work'),('MAT005','Hand-work');

INSERT INTO type (type_id, type_name) VALUES
  ('TYP001','Wedding'),('TYP002','Party'),('TYP003','Casual'),
  ('TYP004','Luxury');

INSERT INTO role_type (role_id, role_name, basic_salary) VALUES
  ('ROL001','Store Manager',80000),('ROL002','Sales Executive',60000),('ROL003','Warehouse Manager',40000);

-- Admin credentials: see .env (ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_NAME)

-- Employees (password: admin123)
INSERT INTO employee (employee_id,emp_name,email,hire_date,cnic,username,password,increment,role_id,is_active) VALUES
  ('EMP001','Mohsin Raza','mohsin@jewellery.com','2023-01-01','3520112345671','ahmad',
   '$2b$12$ArJwVJYWmQsFUOYHzgqdmOyanWoyDy5.hj.fvg34SEzwC44F8nQnS',5000,'ROL001',1),
  ('EMP002','Abid khan','abidkk@jewellery.com','2023-03-15','3984827654328','abid',
   '$2b$12$ArJwVJYWmQsFUOYHzgqdmOyanWoyDy5.hj.fvg34SEzwC44F8nQnS',3000,'ROL002',1),
  ('EMP003','Zara Sheikh','zara@jewellery.com','2023-05-20','3201569913423','zara',
   '$2b$12$ArJwVJYWmQsFUOYHzgqdmOyanWoyDy5.hj.fvg34SEzwC44F8nQnS',6000,'ROL003',1),
  ('EMP004','M. Touqeer ','touqeer@jewellery.com','2023-05-20','3512345322341','zara',
   '$2b$12$ArJwVJYWmQsFUOYHzgqdmOyanWoyDy5.hj.fvg34SEzwC44F8nQnS',7000,'ROL003',1);

-- Employee Contacts
INSERT INTO emp_contacts (phone_number,employee_id) VALUES
  ('+923986935233','EMP001'),
  ('+923320971466','EMP002'),
  ('+92300712u599','EMP003'),
  ('+923218974214','EMP004');

-- Suppliers (password: password123)
INSERT INTO supplier (supplier_id,supplier_name,supplier_type,email,phone_number,password_hash,is_active) VALUES
  ('SUP001','Golden Gems Co.','Manufacturer','contact@goldengems.com','+923001234567',
   '$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('SUP002','Silver Craft Ltd.','Wholesaler','info@silvercraft.com','+923009876543',
   '$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1),
  ('SUP003','Diamond Palace Inc.','Importer','sales@diamondpalace.com','+923005551234',
   '$2b$12$A7H8yRzI3JcP3vZib3W5deNiaD0pqfjKQyPKHIXeYD9ZeapLbB8hq',1);

-- Customers (password: password123)
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

INSERT INTO product (product_id,product_name,description,base_price,origin,weight,category_id,material_id,type_id,is_active,is_featured,stock_quantity) VALUES
  ('P001','The Laurel Collection Set','Diamond Cluster Leaf-Inspired Special Occasion Set',11000.00,'local','18g','CAT005','MAT001','TYP001',1,1,25),
  ('P002','The Eternal Bloom Pearl Set','Rhodium-plated Alloy / Pearl / Zircon',13500.00,'local','30g','CAT005','MAT004','TYP004',1,1,10),
  ('P003','Midnight Flora Lattice Bangle','A premium wide-profile bangle featuring a striking contrast of faceted rectangular black stones and an intricate overlay of clear stone floral clusters',3700.00,'China','7g','CAT003','MAT004','TYP003',1,0,50),
  ('P004','Ruby Flora','A premium rose gold bangle featuring an intricate floral motif',4100.00,'China','8g','CAT003','MAT004','TYP002',1,1,5),
  ('P005','Pastel Pink Statement Earrings','Gold-Plated Pink stone Zircon earings',5000.00,'Indian','4g','CAT004','MAT001','TYP002',1,1,30),
  ('P006','Royal Velvet Earring','Premium Royal Velvet Earrings with gold plating',4500.00,'local','5g','CAT004','MAT001','TYP002',1,0,8),
  ('P007','Silver Sparkle Necklace','Elegant Silver Sparkle Necklace for special occasions',7500.00,'local','12g','CAT002','MAT003','TYP001',1,0,40),
  ('P008','Crystal Charm Bracelet','Beautiful Crystal Charm Bracelet with zircon work',3200.00,'local','10g','CAT003','MAT004','TYP003',1,0,15),
  ('P009','Golden Elegance Ring','Stunning Golden Elegance Ring with hand-work',2800.00,'local','3g','CAT001','MAT005','TYP003',1,0,60),
  ('P010','Bridal Dream Set','Complete Bridal Dream Set for wedding ceremonies',25000.00,'local','45g','CAT005','MAT001','TYP001',1,0,20);

-- Dynamically map Image_URL based on Product_Name
UPDATE product SET image_url = '/uploads/' || product_name || '.png' WHERE image_url IS NULL OR image_url = '';
INSERT INTO inventory (inventory_id,product_quantity,last_stock_update,product_id) VALUES
  ('INV001',25,CURRENT_DATE,'P001'),('INV002',10,CURRENT_DATE,'P002'),
  ('INV003',50,CURRENT_DATE,'P003'),('INV004',5,CURRENT_DATE,'P004'),
  ('INV005',30,CURRENT_DATE,'P005'),('INV006',8,CURRENT_DATE,'P006'),
  ('INV007',40,CURRENT_DATE,'P007'),('INV008',15,CURRENT_DATE,'P008'),
  ('INV009',60,CURRENT_DATE,'P009'),('INV010',20,CURRENT_DATE,'P010');

INSERT INTO design (design_id,design_name,style,color,stone_type,plating_type,description,making_style,product_id) VALUES
  ('D001','Classic Band','Minimalist','Red',NULL,NULL,'Smooth finish','Handcrafted','P001'),
  ('D002','Tear Drop','Elegant','Silver','Diamond','Rhodium','Halo setting','Machine-cut','P002'),
  ('D003','Open Cuff','Modern','Gold',NULL,'Anti-tarnish','Brushed texture','Molded','P003'),
  ('D004','Vintage Stud','Antique','Ruby','Pearl','Gold Wash','Filigree border','Hand-finished','P004'),
  ('D005','Heart Charm','Romantic','Rose Gold',NULL,'Rose Gold','Heart charm with chain','Cast','P005'),
  ('D006','Royal Stud','Royal','Gold','Ruby','Gold Plated','Velvet texture','Handcrafted','P006'),
  ('D007','Sparkle Chain','Elegant','Silver','Diamond','Silver','Sparkling finish','Machine-cut','P007'),
  ('D008','Crystal Link','Casual','Gold','Crystal','Gold','Link chain','Molded','P008'),
  ('D009','Elegance Band','Minimalist','Gold',NULL,'Gold','Hand-worked texture','Hand-finished','P009'),
  ('D010','Bridal Choker','Traditional','Gold','Pearl','Gold','Complete set','Cast','P010');

INSERT INTO supplier_materials (sm_id,supplier_id,material_id,quantity,unit_of_measure) VALUES
  ('SM001','SUP001','MAT001',5000.00,'grams'),('SM002','SUP001','MAT004',2000.00,'grams'),
  ('SM003','SUP002','MAT002',10000.00,'grams'),('SM004','SUP003','MAT005',500.00,'carats'),
  ('SM005','SUP002','MAT003',1500.00,'grams');

INSERT INTO cart (cart_id,customer_id) VALUES
  ('CART001','C001'),('CART002','C002');
