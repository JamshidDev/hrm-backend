<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('sended_worker_commissions', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('sended_worker_id')->constrained('sended_workers')->cascadeOnDelete();
            $table->foreignId('commission_id')->constrained('worker_positions');
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('sended_worker_commissions');
    }
};
