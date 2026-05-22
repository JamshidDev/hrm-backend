<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('vacancy_application_exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vacancy_application_id')->constrained('vacancy_applications')->cascadeOnDelete();
            $table->foreignId('exam_id')->nullable()->constrained('exams');
            $table->dateTime('created')->nullable();
            $table->dateTime('ended')->nullable();
            $table->integer('result')->nullable();
            $table->boolean('exam_type')->default(false);
            $table->string('active_token')->nullable();
            $table->string('user_agent')->nullable();
            $table->string('ip_address', 15)->nullable();
            $table->boolean('status')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('vacancy_application_exams');
    }
};
