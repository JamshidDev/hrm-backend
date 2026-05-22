<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\BusinessTripEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_business_trips', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->foreignId('worker_id')->constrained('workers')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->constrained('worker_positions')->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('command_id')->nullable()->constrained('commands')->cascadeOnDelete();
            $table->foreignId('work_place_id')->nullable()->constrained('organizations');
            $table->foreignId('department_id')->nullable()->constrained('departments');
            $table->string('to_organization')->nullable();
            $table->tinyInteger('type')->default(BusinessTripEnum::ONE->value)->index();
            $table->date('from')->nullable();
            $table->date('to')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['worker_position_id', 'type', 'from', 'to'], 'unique_worker_business_trip_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_business_trips');
    }
};
