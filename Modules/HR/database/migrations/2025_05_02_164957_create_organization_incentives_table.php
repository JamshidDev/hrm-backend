<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('organization_incentives', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('worker_id')->nullable()->constrained('workers')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->nullable()->constrained('worker_positions');
            $table->string('number')->nullable();
            $table->string('reason')->nullable();
            $table->string('by_whom')->nullable();
            $table->string('gift')->nullable();
            $table->tinyInteger('gift_type')->default(0);
            $table->date('date')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('organization_incentives');
    }
};
