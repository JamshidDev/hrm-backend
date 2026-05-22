<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('report_moth_pers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->integer('year');
            $table->integer('month');
            $table->timestamps();

            $table->unique(['organization_id', 'year', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_moth_pers');
    }
};
