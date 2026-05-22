<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('worker_categories', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained('organizations');
            $table->integer('year')->index();
            $table->integer('month')->index();

            $table->integer('external_worker_count')->default(0); // Ташқи (эксплуатация) ишлари
            $table->double('external_salary_fund')->default(0);

            $table->integer('capital_society_worker_count')->default(0); // Жамият корхоналари учун
            $table->double('capital_society_salary_fund')->default(0);

            $table->integer('capital_own_use_worker_count')->default(0); // Ўз эҳтиёж учун
            $table->double('capital_own_use_salary_fund')->default(0);

            $table->integer('capital_foreign_company_worker_count')->nullable(); // Чет корхона учун
            $table->double('capital_foreign_company_salary_fund')->nullable();

            $table->integer('construction_society_worker_count')->default(0); // Жамият корхоналари учун/ Kapital qurilish
            $table->double('construction_society_salary_fund')->default(0);

            $table->integer('construction_own_use_worker_count')->default(0); // Ўз эҳтиёж учун
            $table->double('construction_own_use_salary_fund')->default(0);

            $table->integer('construction_foreign_company_worker_count')->default(0); // Чет корхона учун
            $table->double('construction_foreign_company_salary_fund')->default(0);

            $table->integer('other_society_worker_count')->default(0); // Жамият корхоналари учун/ Kapital qurilish
            $table->double('other_society_salary_fund')->default(0);

            $table->integer('other_own_use_worker_count')->default(0); // Ўз эҳтиёж учун
            $table->double('other_own_use_salary_fund')->default(0);

            $table->integer('other_foreign_company_worker_count')->default(0); // Чет корхона учун
            $table->double('other_foreign_company_salary_fund')->default(0);

            $table->integer('temporary_contract_worker_count')->default(0); // Муддатли меҳнат шартномаси
            $table->double('temporary_contract_salary_fund')->default(0);

            $table->integer('civil_contract_worker_count')->default(0); // Фуқаролик-ҳуқуқий шартнома асосида
            $table->double('civil_contract_salary_fund')->default(0);

            $table->integer('freelancer_worker_count')->default(0); // Касаначилар
            $table->double('freelancer_salary_fund')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_categories');
    }
};
