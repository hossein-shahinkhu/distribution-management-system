# معماری فنی سیستم مدیریت پخش کالا

## ۱. دیاگرام ارتباط جداول (ER Diagram)

```mermaid
erDiagram
    ROLE ||--o{ USER : "دارد"
    USER ||--o| DISTRIBUTOR : "می‌تواند باشد"
    CATEGORY ||--o{ PRODUCT : "دسته‌بندی می‌کند"
    CUSTOMER ||--o{ ORDER : "ثبت می‌کند"
    USER ||--o{ ORDER : "به‌عنوان فروشنده"
    DISTRIBUTOR ||--o{ ORDER : "تحویل می‌دهد"
    ORDER ||--o{ ORDER_ITEM : "شامل"
    PRODUCT ||--o{ ORDER_ITEM : "در سفارش"
    ORDER ||--|| INVOICE : "صادر می‌کند"

    ROLE {
        int id PK
        string name
    }
    USER {
        int id PK
        string full_name
        string email
        int role_id FK
    }
    CATEGORY {
        int id PK
        string name
    }
    PRODUCT {
        int id PK
        string sku
        string name
        int category_id FK
        decimal unit_price
        int stock_quantity
        int reorder_level
    }
    CUSTOMER {
        int id PK
        string full_name
        string phone
        string city
    }
    DISTRIBUTOR {
        int id PK
        string full_name
        string vehicle_plate
    }
    ORDER {
        int id PK
        string order_number
        int customer_id FK
        int distributor_id FK
        string status
        decimal total_amount
    }
    ORDER_ITEM {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal line_total
    }
    INVOICE {
        int id PK
        string invoice_number
        int order_id FK
        decimal total_amount
        string payment_status
    }
```

## ۲. معماری لایه‌ای بک‌اند

```mermaid
flowchart TD
    Client["فرانت‌اند (React)"] -->|"HTTP + JWT"| Routes["Routes (Express Router)"]
    Routes --> Middleware["Middleware احراز هویت و کنترل نقش"]
    Middleware --> Controllers["Controllers"]
    Controllers --> Models["Models (Sequelize)"]
    Models --> DB[("PostgreSQL")]
```

## ۳. توالی ثبت سفارش (نمودار Sequence)

این نمودار نشان می‌دهد چگونه ثبت سفارش، بررسی موجودی، و کسر انبار در یک تراکنش واحد انجام می‌شود تا از ناهماهنگی داده جلوگیری شود.

```mermaid
sequenceDiagram
    participant F as فروشنده (فرانت‌اند)
    participant API as Order Controller
    participant DB as پایگاه‌داده

    F->>API: POST /api/orders (مشتری + اقلام)
    API->>DB: شروع تراکنش
    loop برای هر قلم کالا
        API->>DB: بررسی موجودی کالا (با قفل ردیف)
        alt موجودی کافی نیست
            API->>DB: rollback تراکنش
            API-->>F: خطای ۴۰۰ (موجودی ناکافی)
        else موجودی کافی است
            API->>DB: کسر موجودی کالا
        end
    end
    API->>DB: ثبت سفارش و اقلام سفارش
    API->>DB: commit تراکنش
    API-->>F: سفارش ثبت‌شده (۲۰۱)
```

## ۴. تصمیمات فنی کلیدی

- **تراکنش دیتابیس در ثبت سفارش**: بررسی موجودی و کسر آن در یک تراکنش Sequelize انجام می‌شود تا در صورت هم‌زمانی چند سفارش، موجودی هرگز منفی یا ناهماهنگ نشود.
- **حذف نرم (Soft Delete) برای کالا و توزیع‌کننده**: به‌جای حذف فیزیکی، فیلد `is_active` غیرفعال می‌شود تا سابقهٔ سفارش‌های گذشته که به این رکوردها ارجاع دارند حفظ شود.
- **جداسازی `app.js` از `index.js`**: تعریف اپلیکیشن Express از راه‌اندازی سرور جدا شده تا امکان تست خودکار (بدون نیاز به اتصال شبکه واقعی) فراهم شود.
- **کنترل دسترسی مبتنی بر نقش در سطح Middleware**: هر مسیر مشخص می‌کند کدام نقش‌ها مجاز به دسترسی هستند، نه در سطح Controller، تا منطق دسترسی متمرکز و قابل‌ممیزی باشد.
