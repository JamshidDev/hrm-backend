<?php

namespace Modules\ProjectService\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class TranslateController extends Controller
{


    public function translate(Request $request)
    {
        $libreOfficePath = '"C:\Program Files\LibreOffice\program\soffice.exe"';

//        $inputFile = $request->file('file');
//        $outputDir = public_path();
//
//        $command = "$libreOfficePath --headless --convert-to html \"$inputFile\" --outdir \"$outputDir\"";
//        exec($command);
//        return 1;


        $pandocPath = '"C:\Program Files\Pandoc\pandoc.exe"';
        $transliteratedFile = public_path('phpF217.html');
        $finalDocx = public_path('final.docx');

//        $command = "$libreOfficePath --headless --convert-to docx \"$transliteratedFile\" --outdir \"$finalDocx\"";
        $command = "$pandocPath -s \"$transliteratedFile\" -o \"$finalDocx\"";
        exec($command);

        return 1;

    }

}
