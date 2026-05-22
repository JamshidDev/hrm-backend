<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('user_turnstile_devices', static function (Blueprint $table) {
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->bigInteger('hik_central_device_id')->index();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('user_turnstile_devices');
    }
};
