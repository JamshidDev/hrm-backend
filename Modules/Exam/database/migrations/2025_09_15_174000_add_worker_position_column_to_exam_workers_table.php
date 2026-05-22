<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('exam_workers', static function (Blueprint $table) {
           $table->foreignId('worker_position_id')
               ->nullable()
               ->after('worker_id')
               ->constrained('worker_positions');
        });
    }


    public function down(): void
    {
        Schema::table('exam_workers', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('worker_position_id');
        });
    }
};
