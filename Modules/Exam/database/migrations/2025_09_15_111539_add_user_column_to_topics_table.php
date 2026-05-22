<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('topics', static function (Blueprint $table) {
            $table->foreignId('user_id')
                ->nullable()
                ->after('organization_id')
                ->constrained('users')
                ->cascadeOnDelete();
        });

        Schema::table('exams', static function (Blueprint $table) {
            $table->foreignId('user_id')
                ->nullable()
                ->after('topic_id')
                ->constrained('users')
                ->cascadeOnDelete();
        });
    }


    public function down(): void
    {
        Schema::table('topics', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
        Schema::table('exams', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
