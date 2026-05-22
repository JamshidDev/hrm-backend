<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('organizations', static function (Blueprint $table) {
            $table->string('bot_token')->nullable()->after('external');
        });
    }


    public function down(): void
    {
        Schema::table('organizations', static function (Blueprint $table) {
            $table->dropColumn('bot_token');
        });
    }
};
