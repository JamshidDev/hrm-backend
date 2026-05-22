<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('turnstile_worker_approves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('receiver_id')->nullable()->constrained('users');
            $table->foreignId('receiver_organization_id')->constrained('organizations');
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->tinyInteger('approved')->default(1);
            $table->text('approved_comment')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('turnstile_worker_approves');
    }
};
