<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('worker_positions', static function (Blueprint $table) {
            // Asosiy filter querylar uchun
            $table->index(['organization_id', 'status']);

            // Worker bazali querylar uchun
            $table->index(['worker_id', 'status']);

            // Kompozit indexlar
            $table->index(['organization_id', 'status', 'worker_id']);
            $table->index(['worker_id', 'organization_id', 'status']);
        });
    }


    public function down(): void
    {
        Schema::table('worker_positions', static function (Blueprint $table) {
            $table->dropIndex(['organization_id', 'status']);
            $table->dropIndex(['worker_id', 'status']);
            $table->dropIndex(['organization_id', 'status', 'worker_id']);
            $table->dropIndex(['worker_id', 'organization_id', 'status']);
        });
    }
};
