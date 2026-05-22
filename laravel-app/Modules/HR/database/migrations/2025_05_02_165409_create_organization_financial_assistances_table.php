<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('organization_financial_assistances', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('worker_id')->nullable()->constrained('workers')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->nullable()->constrained('worker_positions');
            $table->foreignId('command_id')->nullable()->constrained('commands')->cascadeOnDelete();
            $table->string('number')->nullable();
            $table->text('reason')->nullable();
            $table->string('amount_text')->nullable();
            $table->tinyInteger('type')->nullable();
            $table->double('amount')->nullable();
            $table->date('date')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('organization_financial_assistances');
    }
};
