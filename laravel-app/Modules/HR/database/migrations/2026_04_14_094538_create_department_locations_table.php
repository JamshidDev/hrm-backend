<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('department_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained();
            $table->boolean('geo_type')->index()->default(false)->comment('circle=false,polygon=true');
            $table->double('lat');
            $table->double('lng');
            $table->integer('radius')->default(30);
            $table->json('polygon')->nullable();
            $table->integer('accuracy_limit')->nullable();
            $table->timestamps();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('department_locations');
    }
};
