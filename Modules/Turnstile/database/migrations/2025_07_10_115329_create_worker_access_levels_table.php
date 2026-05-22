<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('worker_access_levels', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('workers');
            $table->foreignId('worker_hik_central_id')->constrained('worker_hik_centrals');
            $table->foreignId('worker_photo_id')->constrained('worker_photos');
            $table->tinyInteger('hik_central_key')->index();
            $table->bigInteger('hik_central_person_id')->nullable();
            $table->foreignId('hik_central_access_level_id')->constrained('hik_central_access_levels');
            $table->dateTime('to')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['worker_id', 'hik_central_access_level_id'], 'unique_worker_access_levels');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_access_levels');
    }
};
