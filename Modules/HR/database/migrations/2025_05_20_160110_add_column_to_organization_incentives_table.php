<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('organization_incentives', static function (Blueprint $table) {
            $table->foreignId('command_id')->nullable()
                ->after('organization_id')
                ->constrained('commands')
                ->cascadeOnDelete();
        });
    }


    public function down(): void
    {
        Schema::table('organization_incentives', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('command_id');
        });
    }
};
