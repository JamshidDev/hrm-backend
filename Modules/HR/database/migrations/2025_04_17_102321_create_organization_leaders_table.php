<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('organization_leaders', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->onDelete('cascade');
            $table->foreignId('worker_position_id')->constrained('worker_positions');
            $table->json('phones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organization_id', 'worker_position_id']);
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('organization_leaders');
    }
};
