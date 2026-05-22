<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('vacancy_user_careers', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('vacancy_user_id')->constrained('vacancy_users')->cascadeOnDelete();
            $table->date('from')->nullable();
            $table->date('to')->nullable();
            $table->text('position')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('vacancy_user_careers');
    }
};
