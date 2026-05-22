<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('hik_central_access_levels', static function (Blueprint $table) {
            $table->id();
            $table->tinyInteger('hik_central_key')->index();
            $table->bigInteger('hik_central_access_level_id')->nullable();
            $table->string('name')->nullable();
            $table->string('description')->nullable();
            $table->smallInteger('devices_count')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['hik_central_key', 'hik_central_access_level_id'], 'unique_hik_central_access_levels');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hik_central_access_levels');
    }
};
