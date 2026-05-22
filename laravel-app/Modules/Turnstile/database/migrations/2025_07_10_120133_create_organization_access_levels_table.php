<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_access_levels', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('hik_central_access_level_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_access_levels');
    }
};
