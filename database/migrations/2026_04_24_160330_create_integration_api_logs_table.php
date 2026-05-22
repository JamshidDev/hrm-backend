<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('integration_api_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('secret', '50')->nullable();
            $table->string('endpoint')->nullable();
            $table->string('method', 10)->nullable();

            $table->enum('api_type', ['hmac', 'sanctum', 'jwt', 'oauth'])->default('sanctum');

            $table->jsonb('request_headers')->nullable();
            $table->jsonb('request_body')->nullable();

            $table->integer('response_status')->nullable();
            $table->jsonb('response_headers')->nullable();
            $table->jsonb('response_body')->nullable();

            $table->text('error')->nullable();
            $table->integer('duration_ms')->nullable();

            $table->timestamps();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('integration_api_logs');
    }
};
