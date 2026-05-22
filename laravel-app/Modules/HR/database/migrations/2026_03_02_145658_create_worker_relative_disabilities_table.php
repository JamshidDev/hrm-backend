<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('worker_relative_disabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_relative_id')->constrained('worker_relatives')->cascadeOnDelete();
            $table->tinyInteger('level')->index();
            $table->string('number')->nullable();
            $table->date('from')->nullable();
            $table->date('to')->nullable();
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_relative_disabilities');
    }
};
