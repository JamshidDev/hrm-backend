<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('vacancy_application_files', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('vacancy_application_id')->constrained('vacancy_applications')->cascadeOnDelete();
            $table->tinyInteger('file_type');
            $table->string('file')->nullable();
            $table->string('file_name')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('vacancy_application_files');
    }
};
