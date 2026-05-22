<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('vacations', static function (Blueprint $table) {
            $table->index(['worker_id', 'to']);
            $table->index(['worker_id', 'from']);
            $table->index(['worker_id', 'from', 'to']);
        });
    }


    public function down(): void
    {
        Schema::table('vacations', static function (Blueprint $table) {
            $table->dropIndex(['worker_id', 'to']);
            $table->dropIndex(['worker_id', 'from']);
            $table->dropIndex(['worker_id', 'from', 'to']);
        });
    }
};
