<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('sended_workers', static function (Blueprint $table) {
            $table->id();
            $table->uuid();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->foreignId('organization_id')->nullable()->constrained('organizations');
            $table->foreignId('worker_id')->nullable()->constrained('workers')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->nullable()->constrained('worker_positions');
            $table->foreignId('polyclinic_id')->nullable()->constrained('organizations');
            $table->foreignId('commission_leader_id')->nullable()->constrained('worker_positions');
            $table->integer('number')->index()->nullable();
            $table->date('start_date')->nullable();
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->tinyInteger('confirmation')->default(ConfirmationStatusEnum::PROCESS->value);
            $table->tinyInteger('status')->nullable();
            $table->tinyInteger('generate')->default(1);
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sended_workers');
    }
};
