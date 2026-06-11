-- CreateTable
CREATE TABLE "Roles" (
    "role_id" SERIAL NOT NULL,
    "role_name" TEXT NOT NULL,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "Users" (
    "user_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "full_name" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3),

    CONSTRAINT "Users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Rooms" (
    "room_id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "address_id" INTEGER NOT NULL,
    "original_price" DECIMAL(65,30),
    "discount_price" DECIMAL(65,30),
    "forecast_price" DECIMAL(65,30),
    "update_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "avg_rating" DECIMAL(65,30),

    CONSTRAINT "Rooms_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "Addresses" (
    "address_id" SERIAL NOT NULL,
    "ward_id" INTEGER NOT NULL,
    "detail" TEXT NOT NULL,
    "lat" DECIMAL(65,30) NOT NULL,
    "lng" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Addresses_pkey" PRIMARY KEY ("address_id")
);

-- CreateTable
CREATE TABLE "Wards" (
    "ward_id" SERIAL NOT NULL,
    "ward_name" TEXT NOT NULL,

    CONSTRAINT "Wards_pkey" PRIMARY KEY ("ward_id")
);

-- CreateTable
CREATE TABLE "Posts" (
    "post_id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "post_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Posts_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "RoomFeatures" (
    "feature_id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "area_size" DECIMAL(65,30),
    "has_wifi" BOOLEAN NOT NULL DEFAULT false,
    "has_air_con" BOOLEAN NOT NULL DEFAULT false,
    "has_parking" BOOLEAN NOT NULL DEFAULT false,
    "distance_to_center" DECIMAL(65,30),
    "neighborhood_safety_score" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "furnished" BOOLEAN,
    "floors" INTEGER,
    "has_balcony" BOOLEAN,

    CONSTRAINT "RoomFeatures_pkey" PRIMARY KEY ("feature_id")
);

-- CreateTable
CREATE TABLE "Conversations" (
    "conv_id" SERIAL NOT NULL,
    "user1_id" INTEGER NOT NULL,
    "user2_id" INTEGER NOT NULL,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversations_pkey" PRIMARY KEY ("conv_id")
);

-- CreateTable
CREATE TABLE "Messages" (
    "msg_id" SERIAL NOT NULL,
    "conv_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "message_text" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Messages_pkey" PRIMARY KEY ("msg_id")
);

-- CreateTable
CREATE TABLE "Media" (
    "media_id" SERIAL NOT NULL,
    "post_id" INTEGER,
    "message_id" INTEGER,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("media_id")
);

-- CreateTable
CREATE TABLE "RoomReviews" (
    "review_id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomReviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "UserReviews" (
    "u_review_id" SERIAL NOT NULL,
    "reviewer_id" INTEGER NOT NULL,
    "target_user_id" INTEGER NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserReviews_pkey" PRIMARY KEY ("u_review_id")
);

-- CreateTable
CREATE TABLE "RoomReviewComments" (
    "comment_id" SERIAL NOT NULL,
    "review_id" INTEGER NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomReviewComments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "UserReviewComments" (
    "comment_id" SERIAL NOT NULL,
    "review_id" INTEGER NOT NULL,
    "target_user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserReviewComments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "RoommateRequests" (
    "request_id" SERIAL NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "room_id" INTEGER,
    "preferred_gender" TEXT,
    "min_age" INTEGER,
    "ward_id" INTEGER,
    "max_age" INTEGER,
    "budget" DECIMAL(65,30),
    "habits" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoommateRequests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "Reports" (
    "report_id" SERIAL NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" INTEGER,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "AdminLogs" (
    "log_id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_id" INTEGER,
    "action_details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLogs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "Contracts" (
    "contract_id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "monthly_rent" DECIMAL(65,30),
    "deposit_amount" DECIMAL(65,30),
    "status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contracts_pkey" PRIMARY KEY ("contract_id")
);

-- CreateTable
CREATE TABLE "Invoices" (
    "invoice_id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "Payments" (
    "payment_id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_method" TEXT,
    "paid_at" TIMESTAMP(3),
    "status" TEXT,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Roles_role_name_key" ON "Roles"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Conversations_user1_id_user2_id_key" ON "Conversations"("user1_id", "user2_id");

-- CreateIndex
CREATE UNIQUE INDEX "RoomReviewComments_review_id_key" ON "RoomReviewComments"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserReviewComments_review_id_key" ON "UserReviewComments"("review_id");

-- CreateIndex
CREATE UNIQUE INDEX "RoommateRequests_sender_id_room_id_key" ON "RoommateRequests"("sender_id", "room_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoices_contract_id_month_year_key" ON "Invoices"("contract_id", "month", "year");

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rooms" ADD CONSTRAINT "Rooms_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rooms" ADD CONSTRAINT "Rooms_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "Addresses"("address_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Addresses" ADD CONSTRAINT "Addresses_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "Wards"("ward_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Posts" ADD CONSTRAINT "Posts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFeatures" ADD CONSTRAINT "RoomFeatures_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversations" ADD CONSTRAINT "Conversations_user1_id_fkey" FOREIGN KEY ("user1_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversations" ADD CONSTRAINT "Conversations_user2_id_fkey" FOREIGN KEY ("user2_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_conv_id_fkey" FOREIGN KEY ("conv_id") REFERENCES "Conversations"("conv_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Messages"("msg_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "Posts"("post_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomReviews" ADD CONSTRAINT "RoomReviews_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomReviews" ADD CONSTRAINT "RoomReviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReviews" ADD CONSTRAINT "UserReviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReviews" ADD CONSTRAINT "UserReviews_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomReviewComments" ADD CONSTRAINT "RoomReviewComments_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "RoomReviews"("review_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomReviewComments" ADD CONSTRAINT "RoomReviewComments_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReviewComments" ADD CONSTRAINT "UserReviewComments_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "UserReviews"("u_review_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReviewComments" ADD CONSTRAINT "UserReviewComments_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoommateRequests" ADD CONSTRAINT "RoommateRequests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoommateRequests" ADD CONSTRAINT "RoommateRequests_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Rooms"("room_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoommateRequests" ADD CONSTRAINT "RoommateRequests_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "Wards"("ward_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reports" ADD CONSTRAINT "Reports_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLogs" ADD CONSTRAINT "AdminLogs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contracts" ADD CONSTRAINT "Contracts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Rooms"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contracts" ADD CONSTRAINT "Contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "Contracts"("contract_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoices"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;
