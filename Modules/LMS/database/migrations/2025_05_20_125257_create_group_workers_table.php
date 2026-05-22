<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_workers', static function (Blueprint $table) {
            $table->foreignId('group_id')
                ->constrained('groups')
                ->cascadeOnDelete();

            $table->foreignId('worker_id')
                ->constrained('workers')
                ->cascadeOnDelete();

            $table->foreignId('worker_position_id'
            )->constrained('worker_positions')
                ->cascadeOnDelete();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('group_workers');
    }
};
