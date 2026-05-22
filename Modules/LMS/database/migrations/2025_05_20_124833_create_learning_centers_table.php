<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('learning_centers', static function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_ru')->nullable();
            $table->string('name_en')->nullable();
            $table->string('code', 7)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('learning_centers');
    }
};
