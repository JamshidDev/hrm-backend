<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('sync_h_c_p_access_logs', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn('inserted');
            $table->dropColumn('from_time');
            $table->dropColumn('to_time');
            $table->dropIndex('sync_h_c_p_access_logs_size_index');
            $table->dropColumn('size');
            $table->dateTime('sync_datetime')->nullable()->after('id');
        });
    }


    public function down(): void
    {
        Schema::table('sync_h_c_p_access_logs', static function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users');
            $table->integer('inserted')->default(0);
            $table->dateTime('from_time')->nullable();
            $table->dateTime('to_time')->nullable();
            $table->integer('size')->index()->default(0);
            $table->dropColumn('sync_datetime');
        });
    }
};
