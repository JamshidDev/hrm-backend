<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('pension_payments', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained('organizations');
            $table->foreignId('economist_upload_id')->constrained('economist_uploads');
            $table->foreignId('worker_id')->nullable()->constrained('workers');
            $table->bigInteger('pin')->index()->nullable();
            $table->integer('year')->index();
            $table->integer('month')->index();
            $table->string('last_name')->nullable();
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->double('income_tax_paid')->default(0);
            $table->double('mandatory_pension_contribution')->default(0);
            $table->double('voluntary_pension_contribution')->default(0);
            $table->double('total_contributions')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pension_payments');
    }
};
