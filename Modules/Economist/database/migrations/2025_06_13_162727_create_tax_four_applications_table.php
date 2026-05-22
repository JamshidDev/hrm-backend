<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('tax_four_applications', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('economist_upload_id')->constrained('economist_uploads');
            $table->foreignId('organization_id')->nullable()->constrained('organizations');
            $table->foreignId('worker_id')->nullable()->constrained('workers');
            $table->bigInteger('pin')->index()->nullable();
            $table->integer('month')->index();
            $table->integer('year')->index();
            $table->string('full_name')->nullable();
            $table->string('position')->nullable();
            $table->tinyInteger('employee_status')->default(1);
            $table->tinyInteger('contract_type')->default(1);
            $table->double('total_salary_income')->default(0);
            $table->double('reported_salary_income')->default(0);
            $table->double('total_tax')->default(0);
            $table->double('reported_tax')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('tax_four_applications');
    }
};
