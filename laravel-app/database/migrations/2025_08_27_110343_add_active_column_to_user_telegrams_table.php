<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('user_telegrams', static function (Blueprint $table) {
            $table->boolean('active')->after('chat_id')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('user_telegrams', static function (Blueprint $table) {
            $table->dropColumn('active');
        });
    }
};
