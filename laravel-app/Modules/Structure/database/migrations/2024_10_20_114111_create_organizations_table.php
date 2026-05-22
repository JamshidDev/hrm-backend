<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('organizations', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->constrained('cities');
            $table->tinyInteger('sort')->index()->default(1);
            $table->string('code', 15)->index();
            $table->string('name')->nullable();
            $table->string('name_ru')->nullable();
            $table->string('name_en')->nullable();
            $table->string('full_name')->nullable();
            $table->integer('level')->index();
            $table->nestedSet();
            $table->bigInteger('inn')->nullable();
            $table->string('lat', 30)->nullable();
            $table->string('long', 30)->nullable();
            $table->string('address')->nullable();
            $table->boolean('group')->default(false);
            $table->integer('external')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
