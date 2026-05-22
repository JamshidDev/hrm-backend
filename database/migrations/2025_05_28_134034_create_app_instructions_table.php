<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('app_instructions', static function (Blueprint $table) {
            $table->id();
            $table->string('menu', 50)->index();
            $table->string('sub_menu', 50)->index();
            $table->string('title')->nullable();
            $table->string('title_ru')->nullable();
            $table->string('title_en')->nullable();
            $table->longText('text')->nullable();
            $table->longText('text_ru')->nullable();
            $table->longText('text_en')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('app_instructions');
    }
};
