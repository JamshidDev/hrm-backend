<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('learning_centers', function (Blueprint $table) {
            $table->foreignId('director_id')->nullable()->constrained('worker_positions');
        });
    }


    public function down(): void
    {
        Schema::table('learning_centers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('director_id');
        });
    }
};
