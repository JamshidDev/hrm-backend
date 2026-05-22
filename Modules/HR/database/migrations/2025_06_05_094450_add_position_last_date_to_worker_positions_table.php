<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('worker_positions', static function (Blueprint $table) {
            $table->date('to')->nullable()->index()->after('position_date');
        });
    }


    public function down(): void
    {
        Schema::table('worker_positions', static function (Blueprint $table) {
            $table->dropColumn('to');
        });
    }
};
