<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('vacancy_application_messages', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('vacancy_application_id')->constrained('vacancy_applications')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('vacancy_user_id')->constrained('vacancy_users')->cascadeOnDelete();
            $table->text('message');
            $table->boolean('read')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('vacancy_application_messages');
    }
};
