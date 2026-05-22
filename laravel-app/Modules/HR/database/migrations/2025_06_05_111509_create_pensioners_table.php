<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('pensioners', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations');
            $table->foreignId('worker_id')->nullable()->constrained('workers');
            $table->string('last_name')->nullable();
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->boolean('sex')->default(true);
            $table->text('position')->nullable();
            $table->bigInteger('pin')->nullable()->index();
            $table->string('passport',12)->nullable();
            $table->text('address')->nullable();
            $table->integer('experience')->default(0);
            $table->integer('year')->nullable();
            $table->string('phone',9)->nullable();
            $table->boolean('afghan')->default(false)->index();
            $table->boolean('invalid')->default(false)->index();
            $table->boolean('chernobyl')->default(false)->index();
            $table->boolean('railway_title')->default(false)->index();
            $table->string('file')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('pensioners');
    }
};
