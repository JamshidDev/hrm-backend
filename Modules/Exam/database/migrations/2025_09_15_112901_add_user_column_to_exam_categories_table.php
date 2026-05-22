<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('exam_categories', static function (Blueprint $table) {
            $table->foreignId('user_id')
                ->nullable()
                ->after('organization_id')
                ->constrained('users')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('exam_categories', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
