<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('worker_hik_centrals', static function (Blueprint $table) {
            $table->foreignId('worker_photo_id')
                ->after('hik_central_person_id')
                ->nullable()
                ->constrained('worker_photos');
        });
    }

    public function down(): void
    {
        Schema::table('worker_hik_centrals', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('worker_photo_id');
        });
    }
};
