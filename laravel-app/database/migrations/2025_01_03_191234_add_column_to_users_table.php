<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('users', static function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable()->after('status')
                ->constrained('organizations');
            $table->foreignId('worker_id')->nullable()->after('organization_id')
                ->constrained('workers');

        });
    }


    public function down(): void
    {
        Schema::table('users', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('organization_id');
            $table->dropConstrainedForeignId('worker_id');
        });
    }
};
