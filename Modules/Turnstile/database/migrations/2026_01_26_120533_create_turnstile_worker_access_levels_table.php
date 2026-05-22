<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('turnstile_worker_access_levels', function (Blueprint $table) {
            $table->foreignId('turnstile_worker_approve_id')->constrained('turnstile_worker_approves');
            $table->foreignId('hik_central_access_level_id')->constrained('hik_central_access_levels');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('turnstile_worker_access_levels');
    }
};
