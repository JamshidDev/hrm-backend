<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('worker_access_levels', static function (Blueprint $table) {
            $table->tinyInteger('status')->default(1);
            $table->json('errors')->nullable();

            $table->index('hik_central_person_id', 'idx_person_id');
            $table->index(['hik_central_person_id', 'hik_central_access_level_id'], 'idx_person_access_pair');
            $table->index(['worker_id', 'hik_central_access_level_id'], 'idx_worker_access_pair');
            $table->index(['worker_id', 'hik_central_access_level_id', 'status'], 'idx_worker_access_status');

        });
    }


    public function down(): void
    {
        Schema::table('worker_access_levels', static function (Blueprint $table) {
            $table->dropColumn('status');
            $table->dropColumn('errors');
        });
    }
};
