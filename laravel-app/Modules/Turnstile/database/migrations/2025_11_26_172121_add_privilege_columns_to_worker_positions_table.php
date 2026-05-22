<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('worker_positions', static function (Blueprint $table) {
            $table->integer('turnstile_privilege_start_minute')->default(0);
            $table->integer('turnstile_privilege_end_minute')->default(0);
        });
    }


    public function down(): void
    {
        Schema::table('worker_positions', static function (Blueprint $table) {
            $table->dropColumn('turnstile_privilege_start_minute');
            $table->dropColumn('turnstile_privilege_end_minute');
        });
    }
};
