<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('hik_central_departments', static function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->integer('hik_central_department_id')->nullable()->index()->unique();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('hik_central_departments');
    }
};
