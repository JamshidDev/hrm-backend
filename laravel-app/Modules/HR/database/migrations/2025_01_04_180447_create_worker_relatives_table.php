<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_relatives', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('workers')->cascadeOnDelete();
            $table->foreignId('relative_worker_id')->nullable()->constrained('workers')->cascadeOnDelete();
            $table->tinyInteger('relative')->index();
            $table->bigInteger('pin')->nullable();
            $table->integer('sort')->index()->default(1);
            $table->date('birthday')->nullable();
            $table->string('last_name', 100)->nullable();
            $table->string('first_name', 100)->nullable();
            $table->string('middle_name', 100)->nullable();
            $table->string('birth_place')->nullable();
            $table->text('post_name')->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_relatives');
    }
};
